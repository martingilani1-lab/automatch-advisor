#!/usr/bin/env python3
"""
Processes car photos dropped into scripts/media/incoming/ into transparent-background WebP
files in public/catalog/, and generates ONE guarded, review-only migration upserting the
corresponding catalog_media rows. Re-runnable: re-processing the same incoming file always
produces the same output and the same migration content (deterministic), and the upsert is
idempotent (ON CONFLICT on the (phase_id, body_type_id, view_angle) unique index this
migration also adds if missing).

Never executes anything against the database -- the migration is written to a file only, for
the user to review and run themselves, per this project's standing rule (CLAUDE.md
Supabase/data-access rules). Never modifies the original files in scripts/media/incoming/.

File naming (parsed, not enforced by extension beyond jpg/jpeg/png/webp):
  <brand>-<model>-<generation_code>-<phase>-<body>[-<angle>].<ext>
  phase is one of: pre-facelift | facelift (checked as a whole token run, not a substring,
  so "pre-facelift" isn't mis-split on the "facelift" inside it).
  angle is one of: front | rear | side | interior | dashboard -- defaults to "front" if the
  last body/angle token isn't one of those words.
  brand/model match catalog_brands/catalog_models case- and accent-insensitively (diacritics
  stripped via NFKD normalization, e.g. "skoda" matches live "Škoda").
  body matches phase_body_dimensions' body_type_id (via catalog_body_types.name) the same way,
  with filename hyphens standing in for the live name's own spaces/hyphens (e.g. the filename
  segment "hatchback-5-door" matches the live name "Hatchback 5-door").

A file that doesn't resolve to EXACTLY ONE live phase_id + body_type_id STOPS THE WHOLE RUN --
nothing is processed, no migration is written, and every failing file is listed (same
zero-files-written-on-STOP discipline as the import-car pipeline). This is deliberate: a
silently-skipped file is a bug nobody notices until the car list is missing a photo.
"""

import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from dotenv import dotenv_values
from supabase import create_client
from PIL import Image, ImageFilter
import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
# Overridable via env for isolated testing against a sandbox directory, without touching the
# real incoming/public/migrations folders -- production runs never need to set these.
INCOMING_DIR = Path(os.environ.get("MEDIA_INCOMING_DIR", SCRIPT_DIR / "incoming"))
OUTPUT_DIR = Path(os.environ.get("MEDIA_OUTPUT_DIR", REPO_ROOT / "public" / "catalog"))
MIGRATIONS_DIR = Path(os.environ.get("MEDIA_MIGRATIONS_DIR", REPO_ROOT / "supabase" / "migrations"))

VALID_ANGLES = {"front", "rear", "side", "interior", "dashboard"}
PHASE_TOKENS = {"pre-facelift": ("pre", "facelift"), "facelift": ("facelift",)}
MAX_WIDTH = 1600
WEBP_QUALITY = 82
NEAR_WHITE_THRESHOLD = 245
FEATHER_PX = 2
PADDING_PX = 24


def normalize(s: str) -> str:
    """lowercase, strip diacritics, hyphens/underscores -> spaces, collapse whitespace."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace("-", " ").replace("_", " ")
    return re.sub(r"\s+", " ", s).strip()


def parse_filename(stem: str):
    """Returns (brand, model, gen, phase, body_slug, angle) or None if the shape doesn't parse
    at all (phase keyword missing, or fewer than 3 tokens before it)."""
    parts = stem.lower().split("-")
    phase = None
    phase_start = None
    phase_len = None
    for i, p in enumerate(parts):
        if p == "facelift":
            if i > 0 and parts[i - 1] == "pre":
                phase, phase_start, phase_len = "pre-facelift", i - 1, 2
            else:
                phase, phase_start, phase_len = "facelift", i, 1
            break
    if phase is None or phase_start < 3:
        return None
    brand, model, gen = parts[0], parts[1], parts[2]
    if phase_start != 3:
        # extra tokens between gen and phase aren't part of this grammar -- treat as unparsed
        return None
    rest = parts[phase_start + phase_len:]
    if not rest:
        return None
    if len(rest) > 1 and rest[-1] in VALID_ANGLES:
        angle = rest[-1]
        body_tokens = rest[:-1]
    else:
        angle = "front"
        body_tokens = rest
    return brand, model, gen, phase, "-".join(body_tokens), angle


def fetch_all_rows(supabase, table: str, select: str):
    page_size = 1000
    rows = []
    start = 0
    while True:
        res = supabase.table(table).select(select).range(start, start + page_size - 1).execute()
        data = res.data or []
        rows.extend(data)
        if len(data) < page_size:
            break
        start += page_size
    return rows


_REMBG_SESSION = None


def remove_background_rembg(img: Image.Image) -> Image.Image:
    # Explicitly pin the u2net model -- rembg's own default `remove()` call (no session arg)
    # resolves to whichever model its current version ships as default (confirmed live: a
    # newer, much larger "bria-rmbg-2.0" model, ~1GB vs. u2net's ~176MB, and noticeably
    # slower), not u2net specifically.
    global _REMBG_SESSION
    from rembg import remove, new_session
    if _REMBG_SESSION is None:
        _REMBG_SESSION = new_session("u2net")
    return remove(img, session=_REMBG_SESSION)


def remove_background_flood_fill(img: Image.Image) -> Image.Image:
    """Fallback when rembg isn't available: flood-fill near-white (>=245 on every channel)
    starting from the image border inward, so enclosed near-white regions inside the car
    (windows, paint highlights) are never touched -- only background connected to an edge is
    removed. A soft ~2px feather on the resulting mask avoids a hard cutout edge."""
    rgba = img.convert("RGBA")
    arr = np.array(rgba)
    rgb = arr[:, :, :3]
    h, w = rgb.shape[:2]

    is_near_white = np.all(rgb >= NEAR_WHITE_THRESHOLD, axis=2)
    visited = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        stack.append((0, x))
        stack.append((h - 1, x))
    for y in range(h):
        stack.append((y, 0))
        stack.append((y, w - 1))

    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or visited[y, x] or not is_near_white[y, x]:
            continue
        visited[y, x] = True
        stack.append((y + 1, x))
        stack.append((y - 1, x))
        stack.append((y, x + 1))
        stack.append((y, x - 1))

    alpha_mask = Image.fromarray((~visited * 255).astype(np.uint8), mode="L")
    alpha_mask = alpha_mask.filter(ImageFilter.GaussianBlur(radius=FEATHER_PX))
    rgba.putalpha(alpha_mask)
    return rgba


def trim_and_pad(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    if bbox is None:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - PADDING_PX)
    top = max(0, top - PADDING_PX)
    right = min(img.width, right + PADDING_PX)
    bottom = min(img.height, bottom + PADDING_PX)
    return img.crop((left, top, right, bottom))


def resize_max_width(img: Image.Image, max_width: int) -> Image.Image:
    if img.width <= max_width:
        return img
    ratio = max_width / img.width
    return img.resize((max_width, round(img.height * ratio)), Image.LANCZOS)


def process_one(src_path: Path, dst_path: Path, use_rembg: bool) -> None:
    img = Image.open(src_path).convert("RGB")
    if use_rembg:
        cut = remove_background_rembg(img)
    else:
        cut = remove_background_flood_fill(img)
    trimmed = trim_and_pad(cut)
    resized = resize_max_width(trimmed, MAX_WIDTH)
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    resized.save(dst_path, "WEBP", quality=WEBP_QUALITY)


def ts_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def display_path(p: Path) -> str:
    try:
        return str(p.relative_to(REPO_ROOT))
    except ValueError:
        return str(p)


def main():
    env = dotenv_values(REPO_ROOT / ".env.local")
    url = env.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = create_client(url, key)

    try:
        from rembg import remove  # noqa: F401
        use_rembg = True
    except ImportError:
        use_rembg = False
    print(f"Background removal: {'rembg (u2net)' if use_rembg else 'edge flood-fill fallback'}")

    phases = fetch_all_rows(
        supabase, "catalog_phases",
        "id,generation_code,phase_label,catalog_models(name,catalog_brands(name))",
    )
    body_types_by_phase = {}
    for row in fetch_all_rows(supabase, "phase_body_dimensions", "phase_id,body_type_id,catalog_body_types(name)"):
        body_types_by_phase.setdefault(row["phase_id"], []).append(
            (row["body_type_id"], row["catalog_body_types"]["name"])
        )

    incoming_files = sorted(
        p for p in INCOMING_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
    )
    if not incoming_files:
        print(f"No image files found in {INCOMING_DIR} -- nothing to do.")
        return

    matched = []
    failures = []
    for path in incoming_files:
        parsed = parse_filename(path.stem)
        if parsed is None:
            failures.append(f"{path.name}: doesn't match <brand>-<model>-<gen>-<phase>-<body>[-<angle>] (phase token not found)")
            continue
        brand, model, gen, phase, body_slug, angle = parsed

        phase_candidates = [
            p for p in phases
            if normalize((p.get("catalog_models") or {}).get("catalog_brands", {}).get("name", "")) == normalize(brand)
            and normalize((p.get("catalog_models") or {}).get("name", "")) == normalize(model)
            and (p.get("generation_code") or "").lower() == gen
            and (p.get("phase_label") or "").lower().replace(" ", "-") == phase
        ]
        if len(phase_candidates) != 1:
            failures.append(f"{path.name}: {len(phase_candidates)} live phases match brand={brand} model={model} gen={gen} phase={phase} (expected exactly 1)")
            continue
        phase_id = phase_candidates[0]["id"]

        body_candidates = [
            bt_id for bt_id, name in body_types_by_phase.get(phase_id, [])
            if normalize(name) == normalize(body_slug)
        ]
        if len(body_candidates) != 1:
            available = [name for _, name in body_types_by_phase.get(phase_id, [])]
            failures.append(f"{path.name}: {len(body_candidates)} body types match '{body_slug}' for phase {phase_id} (available: {available})")
            continue
        body_type_id = body_candidates[0]

        matched.append({
            "path": path, "phase_id": phase_id, "body_type_id": body_type_id,
            "angle": angle, "brand": brand, "model": model, "gen": gen, "phase": phase,
            "body_slug": body_slug,
        })

    if failures:
        print(f"\n{len(failures)} file(s) did not match exactly one phase + body_type -- STOPPING. Nothing processed, no migration written.")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)

    print(f"\n{len(matched)} file(s) matched. Processing...")
    rows = []
    is_main_assigned = set()  # phase_ids that have already gotten an is_main row in this batch
    for m in matched:
        dst_path = OUTPUT_DIR / f"{m['path'].stem}.webp"
        process_one(m["path"], dst_path, use_rembg)
        rel_url = f"/catalog/{m['path'].stem}.webp"
        is_main = m["angle"] == "front" and m["phase_id"] not in is_main_assigned
        if is_main:
            is_main_assigned.add(m["phase_id"])
        rows.append({**m, "image_url": rel_url, "is_main": is_main})
        print(f"  {m['path'].name} -> {display_path(dst_path)} (phase={m['phase_id']}, body={m['body_type_id']}, angle={m['angle']}, is_main={is_main})")

    # --- migration ---
    out_path = MIGRATIONS_DIR / f"{ts_now()}_upsert_catalog_media_from_incoming_photos.sql"
    lines = []
    lines.append(f"-- Upserts {len(rows)} catalog_media row(s) from scripts/media/process-images.py processing")
    lines.append("-- scripts/media/incoming/ -- WebP files with transparent backgrounds already written to")
    lines.append("-- public/catalog/. is_main is true for the first 'front' angle photo encountered per")
    lines.append("-- phase in this batch (a phase-wide flag, not per-body); other rows default false.")
    lines.append("--")
    lines.append("-- Adds a unique index on (phase_id, body_type_id, view_angle) first, if missing, so")
    lines.append("-- a re-run of this (or a future) migration upserts instead of duplicating.")
    lines.append("--")
    lines.append("-- Review-only: NOT run by this session.")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")
    lines.append("CREATE UNIQUE INDEX IF NOT EXISTS catalog_media_phase_body_angle_key")
    lines.append("  ON catalog_media (phase_id, body_type_id, view_angle);")
    lines.append("")
    for r in rows:
        lines.append(f"-- {r['path'].name}")
        lines.append("INSERT INTO catalog_media (phase_id, body_type_id, image_url, view_angle, is_main)")
        lines.append(
            f"VALUES ('{r['phase_id']}'::uuid, '{r['body_type_id']}'::uuid, "
            f"'{sql_escape(r['image_url'])}', '{r['angle']}', {str(r['is_main']).lower()})"
        )
        lines.append("ON CONFLICT (phase_id, body_type_id, view_angle) DO UPDATE SET")
        lines.append("  image_url = EXCLUDED.image_url, is_main = EXCLUDED.is_main;")
    lines.append("")
    lines.append(f"-- Postcondition: exactly {len(rows)} rows now exist for these specific (phase, body, angle) triples.")
    lines.append("DO $$")
    lines.append("DECLARE present_n integer;")
    lines.append("BEGIN")
    lines.append("  SELECT count(*) INTO present_n FROM catalog_media WHERE (phase_id, body_type_id, view_angle) IN (")
    lines.append(",\n".join(f"    ('{r['phase_id']}'::uuid, '{r['body_type_id']}'::uuid, '{r['angle']}')" for r in rows))
    lines.append("  );")
    lines.append(f"  IF present_n <> {len(rows)} THEN")
    lines.append(f"    RAISE EXCEPTION 'Expected {len(rows)} catalog_media rows present, found %.', present_n;")
    lines.append("  END IF;")
    lines.append("END $$;")
    lines.append("")
    lines.append("COMMIT;")

    out_path.write_text("\n".join(lines) + "\n")
    print(f"\nWrote {display_path(out_path)} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
