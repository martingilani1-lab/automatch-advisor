-- Two-tier car tags (Martin, 2026-11-02). A car's character depends on WHICH configuration it
-- is (a 1.0 TSI hatchback Golf is a "City commuter", a 2.0 TDI estate a "Highway cruiser"), so
-- tags live at two levels:
--   * MODEL level  -> catalog_phase_tags         (one generation/facelift, i.e. one car page:
--     "3x ISOFIX" or "Stroller friendly" differ between Octavia generations, so the phase is the
--     honest grain, not catalog_models which spans 1996-2024)
--   * CONFIGURATION level -> catalog_configuration_tags (one catalog_vehicle_configurations row:
--     engine + gearbox + body + drivetrain -- "Winter ready" needs the AWD row, "Heavy tower" may
--     need the DSG row)
--
-- Junction tables + a vocabulary table, not a JSONB/enum array: FK integrity (no typo'd tag can
-- exist), one index to find every car with a tag, cascade delete with the car, and the same
-- presence-only pattern as vehicle_safety_features (a row = "has this tag"; absence = not tagged,
-- never a negative row).
--
-- catalog_tags is static reference vocabulary, seeded here (like safety_features). It mirrors
-- TAG_DEFINITIONS in app/catalog/lib/tags.ts -- change both together.
--   tier:           'model' | 'configuration' | 'both' -- which junction may use the tag; enforced
--                   by trigger below (a CHECK can't look into another table).
--   color_category: semantic colour family the UI maps to its design system.
--
-- Schema change: review-only, NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

CREATE TABLE public.catalog_tags (
  slug            text PRIMARY KEY CHECK (slug ~ '^[a-z0-9_]+$'),
  label           text NOT NULL,
  tier            text NOT NULL CHECK (tier IN ('model', 'configuration', 'both')),
  color_category  text NOT NULL CHECK (color_category IN ('economy', 'performance', 'daily', 'utility', 'premium')),
  sort_order      smallint NOT NULL
);

INSERT INTO public.catalog_tags (slug, label, tier, color_category, sort_order) VALUES
  -- Daily use & family (blue)
  ('family_ideal',            'Family ideal',            'both',          'daily',       10),
  ('city_commuter',           'City commuter',           'configuration', 'daily',       20),
  ('highway_cruiser',         'Highway cruiser',         'configuration', 'daily',       30),
  ('seven_seater',            '7-seater',                'configuration', 'daily',       40),
  ('stroller_friendly',       'Stroller friendly',       'model',         'daily',       50),
  ('isofix_3x',               '3x ISOFIX',               'model',         'daily',       60),
  -- Economy & reliability (green)
  ('bulletproof_reliability', 'Bulletproof reliability', 'configuration', 'economy',     10),
  ('ultra_efficient',         'Ultra efficient',         'configuration', 'economy',     20),
  ('value_choice',            'Value choice',            'both',          'economy',     30),
  ('value_retainer',          'Value retainer',          'model',         'economy',     40),
  ('green_zone',              'Green zone (EV/PHEV)',    'configuration', 'economy',     50),
  -- Utility & offroad (amber)
  ('workhorse',               'Workhorse',               'both',          'utility',     10),
  ('heavy_tower',             'Heavy tower',             'configuration', 'utility',     20),
  ('roadtrip_camper',         'Roadtrip/Camper',         'configuration', 'utility',     30),
  ('winter_ready',            'Winter ready (AWD)',      'configuration', 'utility',     40),
  ('true_offroad',            'True offroad',            'configuration', 'utility',     50),
  ('cargo_van',               'Cargo van',               'model',         'utility',     60),
  -- Dynamics & performance (red)
  ('hot_hatch',               'Hot-hatch',               'configuration', 'performance', 10),
  ('drivers_choice',          'Driver''s choice',        'both',          'performance', 20),
  ('sport',                   'Sport',                   'both',          'performance', 30),
  ('sleeper',                 'Sleeper',                 'configuration', 'performance', 40),
  -- Premium & status (purple)
  ('representative',          'Representative',          'model',         'premium',     10),
  ('comfort_cruiser',         'Comfort cruiser',         'both',          'premium',     20),
  ('head_turner',             'Head-turner',             'model',         'premium',     30);

CREATE TABLE public.catalog_phase_tags (
  phase_id  uuid NOT NULL REFERENCES public.catalog_phases(id) ON DELETE CASCADE,
  tag_slug  text NOT NULL REFERENCES public.catalog_tags(slug) ON UPDATE CASCADE,
  PRIMARY KEY (phase_id, tag_slug)
);
CREATE INDEX catalog_phase_tags_tag_idx ON public.catalog_phase_tags (tag_slug);

CREATE TABLE public.catalog_configuration_tags (
  configuration_id  uuid NOT NULL REFERENCES public.catalog_vehicle_configurations(id) ON DELETE CASCADE,
  tag_slug          text NOT NULL REFERENCES public.catalog_tags(slug) ON UPDATE CASCADE,
  PRIMARY KEY (configuration_id, tag_slug)
);
CREATE INDEX catalog_configuration_tags_tag_idx ON public.catalog_configuration_tags (tag_slug);

-- Tier guard: a 'configuration'-only tag can't go on a phase, a 'model'-only tag can't go on a
-- configuration. 'both' fits either.
CREATE FUNCTION public.catalog_tags_check_tier() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t text;
BEGIN
  SELECT tier INTO t FROM public.catalog_tags WHERE slug = NEW.tag_slug;
  IF TG_TABLE_NAME = 'catalog_phase_tags' AND t = 'configuration' THEN
    RAISE EXCEPTION 'Tag % is configuration-level only, not allowed on a phase', NEW.tag_slug;
  ELSIF TG_TABLE_NAME = 'catalog_configuration_tags' AND t = 'model' THEN
    RAISE EXCEPTION 'Tag % is model-level only, not allowed on a configuration', NEW.tag_slug;
  END IF;
  RETURN NEW;
END $$;
-- Only ever called by the triggers -- never from the browser (see CLAUDE.md: new public
-- functions must revoke the default PUBLIC execute grant).
REVOKE EXECUTE ON FUNCTION public.catalog_tags_check_tier() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER catalog_phase_tags_tier BEFORE INSERT OR UPDATE ON public.catalog_phase_tags
  FOR EACH ROW EXECUTE FUNCTION public.catalog_tags_check_tier();
CREATE TRIGGER catalog_configuration_tags_tier BEFORE INSERT OR UPDATE ON public.catalog_configuration_tags
  FOR EACH ROW EXECUTE FUNCTION public.catalog_tags_check_tier();

-- Same access model as the other catalog_ tables: RLS on, read through the app's server routes
-- (service role); no direct browser access.
ALTER TABLE public.catalog_tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_phase_tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_configuration_tags ENABLE ROW LEVEL SECURITY;

COMMIT;
