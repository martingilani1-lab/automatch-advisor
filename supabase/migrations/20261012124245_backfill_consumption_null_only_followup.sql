-- NULL-only follow-up: fills catalog_vehicle_configurations.fuel_consumption_l100km /
-- energy_consumption_kwh100km for rows confirmed present in scripts/fill/consumption.csv
-- with real values but still null live as of this writing -- parts 13, 14 and 15 of the
-- batched backfill (20261012124226/27/28_backfill_consumption_from_csv_part1{3,4,5}_of_19.sql)
-- never successfully completed (part 14 hit the now-fixed DQ400e bug and rolled back;
-- parts 13 and 15 share its batch boundary and were never confirmed re-run). This file
-- targets each affected row by its own id and guards every UPDATE with
-- 'fuel_consumption_l100km is null', so it is safe to run regardless of whether parts
-- 13-15 get re-run first (any row already filled by then is simply skipped, not an error).
--
-- 112 row(s). UPDATE against existing hand-authored data -- file-only, human-run,
-- never executed by the generator or by MCP (see CLAUDE.md Supabase/data-access rules).
--
-- CONFIRMED RUN by Martin. Live check after running: 0 catalog_vehicle_configurations rows
-- missing fuel_consumption_l100km, 0 PHEV configs missing energy_consumption_kwh100km.
-- catalog_vehicle_configurations.fuel_consumption_l100km/energy_consumption_kwh100km backfill
-- is now complete (1550/1550). Kept here, unmodified, as the documented record of what ran --
-- batch parts 13-15 (20261012124226/27/28_backfill_consumption_from_csv_part1{3,4,5}_of_19.sql)
-- were superseded by this file and deleted rather than also run.

do $$
declare
  v_updated integer;
  v_total_updated integer := 0;
  v_total_skipped integer := 0;
begin

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '503a21b0-7b47-454c-bbb2-622a5536f957'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'e4f1e723-47d5-4744-914c-42d4fccff813'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'b7fa23d8-701e-4cc4-acb5-146b888b42db'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 7.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '3b49d909-29d5-4ac9-88f2-850e57f4f721'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 7.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'e05061e6-b6c5-439a-99bb-4a1d7975f183'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 7.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '1baaeef4-3346-4854-a52d-488e10c16c5d'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '9e2df241-6568-42f0-adee-8a8295487182'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '091c859a-df8f-4d22-93a4-ebd6c970d74a'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '41b9efb1-9636-460f-a4bf-1641fa84b3eb'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.1::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '5a6a3ca5-a0fb-4d56-b98c-2653087b698b'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.1::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '6ea791df-e889-4e64-a0a8-f08bfad7d535'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.1::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'b21eba1b-ea6b-4a5c-af5f-225c98dd1066'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '2f318198-c2f8-44f6-89e3-cd86a206ccb2'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'd34f4b89-623b-47d8-9c66-45144108445b'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '4ed2fcd3-b7dc-4e5d-b635-b110f736a94a'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '7c5e2de8-ea01-4001-9366-8422bbfc3f11'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '41a8c4f1-57e2-477a-add6-e2971c480205'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '658e1e8e-9f2c-4453-92c8-f75e5360c75b'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '4dbe0c1a-6812-4279-9489-d6740c96af45'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '001ec459-f12a-4330-be5b-436eb9f311cd'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'e6844576-323c-45aa-be9f-5c7387a91db1'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'a57197b3-8308-4171-9749-369b5fecea72'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '333d16ac-0522-4959-963f-4a332bf73178'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'a68e6a5f-2593-4eac-ba63-143ee4e55062'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '0723335f-721f-4b04-a265-db0b506d2ce6'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '1a1da232-f13e-4073-a703-b7baf7eb85de'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'e2c362dc-8b87-4f0a-9720-fca2e5db216d'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.2::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'd2808692-0ab1-4a7a-aea0-cdc46e275d37'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.2::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '0a7fa607-d5d0-43d6-800c-b70ed2971011'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.2::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '2b8c0574-7867-4bed-b085-023803fb6752'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '4e86796b-072a-4041-ab24-f5f7685d8aa8'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '543b54ad-06c4-4a68-a441-db1b5d24864b'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'c4382f27-399b-4c02-9138-3818872d640e'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'b71d7ed5-b0de-47b5-9680-09d5ace04b6c'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '9ca45140-21f7-412d-a9d5-f3ec1dcfcfad'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '4206ac4b-c2dd-4f08-a0f5-b18d929d764e'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '8245b3a3-d15e-4eb0-8f56-0109d83ea4b4'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'ec5b04b8-ccfd-4629-9efb-86563dc4fdcb'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 9.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'b2e7ee27-6e75-46c3-858a-2eaf2f6d207a'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 9.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '95455d5e-c143-48c9-b65e-ecef3794f1f3'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 9.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '78f172b2-9c03-42d5-8858-016f25fc0d4a'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.4::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'c41c08b7-34eb-41e4-b8dd-3ab90a6110ab'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.4::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '48ec639b-3ffb-46fb-b285-85ed3c267ae0'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'def327c4-8121-4bc3-b0d0-f3fd06f9f71d'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '6ad08760-3d54-4b86-b40d-5e76225a8673'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'fe3e114b-36c5-44fc-b41c-39277e25f063'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '2509a08a-1b63-4afd-b6f6-7dba38b5d1b4'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '858728db-c231-4f4a-a08c-fdce31f87b27'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 8.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '7e85e65f-2644-4deb-bd2d-8f0f8e7dc25e'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 9.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '5bf6f517-2280-47c1-8e52-0fe8e60787eb'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 9.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '26464f30-5f22-484b-8d5a-ad4877bf3ae8'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 9.6::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '7b80a4f0-617a-4e84-879a-195eff65fe7b'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 9.6::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '2063e755-d3fd-4dab-830e-83fdb5c74240'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 10.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '3cb45c04-2891-4ad8-bd09-bdb4e9f02dfe'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 10.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'a4244988-2b6f-46f6-90a4-3b1cfa0930ae'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 10.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '293a58e5-28a2-46d4-aac5-9ceb4f671f91'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 10.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '3f3f5518-18be-41b2-9fd1-7513ed3360a3'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.1::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '1bb4f983-9881-42e5-9995-56ee20e0e80e'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.1::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'a6258dad-43e9-45b1-810b-1bd5a9f40cff'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '41a6b710-ee73-4b97-9a07-7c77eb6fe52d'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'e4f42dd4-37a6-476f-8761-0cc40310caf9'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '58e561d0-4f1e-404a-81dc-b5f2f9e98a50'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '83e5004f-3c65-49e6-9f32-ca041ab7c153'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '9c529418-87f0-46cc-ad75-a6403e330b6d'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '543d6c0a-194e-4ed7-8912-59a70c6cb1a2'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '3f9dd09e-0cd9-4ae3-a151-7e819ec0ae7b'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'b8c6f0d9-b40d-4943-9d7a-758a8d288c52'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.2::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '70c5d94c-8208-4e07-aeaa-780a8f3a47dc'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.2::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '3093ab09-b81c-4fe7-9774-69bd262f40e3'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'b844aab9-6459-476c-810c-115fcd8d43ce'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.0::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '241a00f9-699c-4423-a7c1-eb50eb5267dd'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '49ee75e7-5ba8-48d5-8790-eeb7c3e2f645'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'f4048e4c-a9cc-423d-9aa2-522a492ebdb2'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'afbb4723-7e84-4377-b692-ce43c88ae48c'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.4::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '2fe01ef0-5e46-48ad-80ff-26ab9afaf8ad'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.4::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'ced8f006-951d-4d1c-ae2b-9d21226bcdbd'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.4::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'f33504ff-a1bc-48a7-a009-bde01e46b4d6'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'dd0eb792-bf23-4ea6-ba43-02e2789c6f84'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '1f0de8bf-0fbd-48a1-a96f-4785c2766408'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'b7144798-366b-4834-b385-01ec14b5e5f3'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.7::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'f4a7028e-5dad-4d20-ac85-f5357b7cc193'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.7::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '041bf3c1-b17e-4bde-aaaf-e3eb5bc3c334'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.7::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '4f71c716-c368-48d0-993c-2214fe69303a'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.9::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'd517dfec-ec78-4b1a-9cc4-a1f431fc7d9f'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.9::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '0725b059-87c1-43db-a994-559a16b68b65'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.9::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'a492bdfb-3343-4781-98e8-ca453027a32c'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '1d716083-c1c8-471b-8e30-87e56cfec43e'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '8ba0bb9b-50c2-4037-b33f-b21912d0618e'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.8::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '871cb02a-9e5c-46ca-a0f3-30187987c3c4'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 4.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '332db43a-aefe-4d20-a7ae-a1a05f5e8431'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 4.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '4d2625cd-e8c0-484e-a488-25d89cc08be6'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 4.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '87e9a85d-c8b5-46ad-8fa0-0ad0cae598bb'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.1::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '02752565-13ef-4917-b093-a31489e5f023'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 4.6::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'cf3da68f-5cf9-43cb-a334-e1300cbaabe0'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 4.6::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '606bfde1-f122-404b-b94e-b43bf6e9146d'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 4.6::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'c1677216-6039-44be-af48-370865d797f9'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '58ed18b7-9c49-4ff4-ac8b-1f3809aaa8bb'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.6::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '38800d58-7805-4aef-a33f-3bcd9b22b637'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.1::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '68af6cab-8eae-4f97-a819-818cfa7e795d'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.1::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '2f8d7170-81cc-4299-b82a-c4a053889e26'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.7::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'd7c78068-832e-4923-973f-108967fe6703'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.3::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'b1eadede-5c71-45e1-aa35-789432f9dde0'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 6.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '6811b4f0-835c-4d64-be7b-622631aa52bb'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.2::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'f4cfc749-eb4e-46be-b132-9986dbe3abc5'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.2::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '58a47406-e159-43f8-8379-7d032b71b285'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'ac65260e-5749-480b-8e1c-c0533290f9b1'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '6cf68059-9612-4eb5-a7ac-15ec4b1034e5'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.2::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = 'aeb61924-878b-428f-b678-f6939b3381cf'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.2::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '67e5de0b-2286-4bec-8cea-ac78432409ba'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '41cb325a-a679-4c79-9775-d9716de9ef97'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 5.5::numeric,
    energy_consumption_kwh100km = null::numeric
  where id = '2bb7949a-1035-4ff8-856c-1913053ce0b9'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  update catalog_vehicle_configurations set
    fuel_consumption_l100km = 1.2::numeric,
    energy_consumption_kwh100km = 14.8::numeric
  where id = '7e3fa5dc-6b0f-42aa-854b-9e3a0c5a5c34'::uuid and fuel_consumption_l100km is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    v_total_skipped := v_total_skipped + 1;
  else
    v_total_updated := v_total_updated + v_updated;
  end if;

  raise notice 'Updated % row(s), skipped % (already filled) of 112 total.', v_total_updated, v_total_skipped;
end $$;

