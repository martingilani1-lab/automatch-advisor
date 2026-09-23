-- Adds a UNIQUE constraint on catalog_transmissions.code — a gap in the
-- original catalog-dictionaries schema migration (20260921120000): unlike
-- catalog_engines (unique(code, power_kw)) and drivetrain_systems (unique
-- (code), confirmed already present live), catalog_transmissions never got
-- one. The "Adding a new car" workflow's Step 1 reconcile rule ("code
-- matches an existing row -> REUSE, else CREATE") silently assumes code is
-- unique — without this constraint, nothing stops two rows sharing a code,
-- which would make reuse-matching ambiguous (which row do you reuse?) and
-- let a future seed's ON CONFLICT (code) upserts fail outright.
--
-- Verified via live DB before writing this: zero duplicate codes exist today
-- (`select code, count(*) from catalog_transmissions group by code having
-- count(*) > 1` returned no rows) — safe to add without a pre-cleanup step.
--
-- drivetrain_systems.code already has drivetrain_systems_code_key UNIQUE
-- (code) live (confirmed via pg_constraint) — no action needed there.
-- catalog_engines' (code, power_kw) compound key is correct as-is and is
-- NOT touched here — alt_codes is intentionally non-unique.

alter table catalog_transmissions
  add constraint catalog_transmissions_code_key unique (code);
