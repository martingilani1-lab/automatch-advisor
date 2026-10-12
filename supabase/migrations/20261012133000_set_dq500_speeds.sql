-- Records a manual data fix Martin applied by hand earlier: transmission_units.speeds for
-- VW DQ500 was NULL (never backfilled when this reference row was seeded) and is now 7,
-- confirmed live. The real DQ500 is a 7-speed wet DCT (same family as DQ381/DQ250, just a
-- heavier-duty unit) -- kept here, unmodified, as the documented record of what ran.
-- Guarded: raises if the live value isn't already 7 (i.e. this file is run against a DB
-- state it doesn't actually describe).

do $$
declare
  v_speeds integer;
begin
  select speeds into v_speeds from transmission_units where code = 'VW DQ500';
  if v_speeds is distinct from 7 then
    raise exception 'VW DQ500.speeds is % live, expected 7 -- this file documents a change already made by hand; do not run it against a different state.', v_speeds;
  end if;
end $$;
