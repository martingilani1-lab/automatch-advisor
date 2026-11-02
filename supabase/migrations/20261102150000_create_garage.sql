-- My Garage (Martin, 2026-11-02): signed-in users keep their own cars, service history and
-- deadlines (STK, EK, insurance, vignette), and can opt in to email reminders.
--
-- This is the FIRST user-owned data in the database -- everything before was shared catalog
-- data. So:
--   * every row carries user_id (-> auth.users, ON DELETE CASCADE: deleting an account deletes
--     its garage, nothing orphaned);
--   * Row Level Security on every table: a signed-in user can only ever see/change their own
--     rows, even if a route handler had a bug. The app's own routes use the service role and
--     scope by the verified user id as well -- RLS is the second lock, not the only one;
--   * anon gets nothing at all.
--
-- A garage car can point at the catalog (phase/engine/gearbox/drivetrain -> service intervals
-- come from catalog maintenance data) or be free text only (brand/model typed in). brand/model
-- are always stored as text so the garage still reads correctly if a catalog row changes.
--
-- Schema change: review-only, NOT run by this session. Run in a FRESH Supabase SQL editor tab.

BEGIN;

-- ---- Cars ----------------------------------------------------------------------------------
CREATE TABLE public.garage_vehicles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Catalog link (all nullable: free-text cars have none; a catalog row removed later just
  -- unlinks the car instead of deleting the user's data).
  phase_id            uuid REFERENCES public.catalog_phases(id) ON DELETE SET NULL,
  engine_id           uuid REFERENCES public.catalog_engines(id) ON DELETE SET NULL,
  unit_id             uuid REFERENCES public.transmission_units(id) ON DELETE SET NULL,
  drivetrain_id       uuid REFERENCES public.drivetrain_systems(id) ON DELETE SET NULL,
  brand               text NOT NULL CHECK (length(trim(brand)) > 0),
  model               text NOT NULL CHECK (length(trim(model)) > 0),
  engine_text         text,          -- free-text engine ("1.9 TDI 77 kW") when not from catalog
  nickname            text,
  license_plate       text,
  year_made           smallint CHECK (year_made BETWEEN 1950 AND 2100),
  mileage_km          integer CHECK (mileage_km >= 0),
  mileage_updated_on  date,
  yearly_km           integer CHECK (yearly_km > 0),  -- user's estimate; NULL -> app assumes 15 000
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX garage_vehicles_user_idx ON public.garage_vehicles (user_id);

-- ---- Service history (what was done, when, at what mileage) --------------------------------
-- kind is a closed list on purpose (same frozen-vocabulary pattern as the catalog CHECKs):
-- reminders match a record to a catalog interval by kind, so free text would silently break
-- them. Mirrored in app/garage/lib/vocab.ts -- change both together.
CREATE TABLE public.garage_service_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id  uuid NOT NULL REFERENCES public.garage_vehicles(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN (
                'oil_change', 'timing_belt', 'spark_plugs', 'air_filter', 'fuel_filter', 'cabin_filter',
                'gearbox_service', 'awd_service', 'brake_fluid', 'brakes', 'coolant', 'tyres', 'battery',
                'stk', 'ek', 'other')),
  done_on     date NOT NULL,
  mileage_km  integer CHECK (mileage_km >= 0),
  cost_eur    numeric(10, 2) CHECK (cost_eur >= 0),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX garage_service_records_vehicle_idx ON public.garage_service_records (vehicle_id, kind, done_on DESC);

-- ---- Date deadlines (STK valid until, next insurance payment, ...) -------------------------
-- Stored as the DUE DATE the user knows (it's printed on the STK sticker / insurance letter),
-- not derived: SK/CZ inspection periods depend on vehicle age and category, and getting that
-- wrong would mean a missed STK. One current row per kind per car (except 'other').
CREATE TABLE public.garage_deadlines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id  uuid NOT NULL REFERENCES public.garage_vehicles(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('stk', 'ek', 'insurance', 'vignette', 'other')),
  due_on      date NOT NULL,
  label       text,             -- for 'other' (e.g. "Leasing payment")
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX garage_deadlines_one_per_kind ON public.garage_deadlines (vehicle_id, kind) WHERE kind <> 'other';
CREATE INDEX garage_deadlines_due_idx ON public.garage_deadlines (due_on);

-- ---- Email reminder settings (opt-in) ------------------------------------------------------
CREATE TABLE public.garage_notification_settings (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled  boolean NOT NULL DEFAULT false,
  days_before    smallint NOT NULL DEFAULT 14 CHECK (days_before BETWEEN 1 AND 60),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ---- Sent-reminder log (server only) -------------------------------------------------------
-- One row per reminder email item, so the daily job never sends the same reminder twice.
-- item_key encodes the item AND its due date/km, so a NEW deadline (next year's STK) is a new
-- key and gets its own reminder.
CREATE TABLE public.garage_notifications_sent (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id  uuid NOT NULL REFERENCES public.garage_vehicles(id) ON DELETE CASCADE,
  item_key    text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);

-- ---- Row Level Security --------------------------------------------------------------------
ALTER TABLE public.garage_vehicles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_service_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_deadlines             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_notifications_sent    ENABLE ROW LEVEL SECURITY;

-- Owner-only access for signed-in users.
CREATE POLICY garage_vehicles_owner ON public.garage_vehicles
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Child rows: owner AND the car must be the owner's own (no attaching records to someone
-- else's car id).
CREATE POLICY garage_service_records_owner ON public.garage_service_records
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.garage_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));

CREATE POLICY garage_deadlines_owner ON public.garage_deadlines
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.garage_vehicles v WHERE v.id = vehicle_id AND v.user_id = auth.uid()));

CREATE POLICY garage_notification_settings_owner ON public.garage_notification_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- garage_notifications_sent: no policy at all -> only the service role (daily job) touches it.

-- anon never needs any of this.
REVOKE ALL ON public.garage_vehicles, public.garage_service_records, public.garage_deadlines,
              public.garage_notification_settings, public.garage_notifications_sent FROM anon;
REVOKE ALL ON public.garage_notifications_sent FROM authenticated;

COMMIT;
