CREATE OR REPLACE PROCEDURE load_owners_housing (date_format text)
LANGUAGE plpgsql
AS $$

    DECLARE

    BEGIN

        insert into owners_housing(
            housing_id,
            owner_id,
            rank
        ) select
            h.id,
            o.id,
            6
        from _extract_zlv_ _e_, housing h, owners o, lateral ( select
                upper(ff_ddenom_6) as owner,
                array_remove(array[nullif(trim(ff_dlign3_6), ''), nullif(trim(ff_dlign4_6), ''), nullif(trim(ff_dlign5_6), ''), nullif(trim(ff_dlign6_6), '')], null) as owner_raw_address,
                (case when ff_jdatnss_6 <> '0' and ff_jdatnss_6 not like '00/00/%' and ff_jdatnss_6 not like '%/%/18%' then to_date(ff_jdatnss_6 || ' 20', date_format) end) as birth_date
            ) var
        where _e_.ff_idlocal = h.local_id
          and ff_ccthp in ('V', 'L', 'P')
          and ff_ddenom_6 is not null
          and o.full_name = upper(var.owner)
          and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
          and not exists(
              select * from owners_housing oh where oh.housing_id = h.id and (oh.owner_id = o.id or rank = 1)
          )
        group by h.id, o.id;

        insert into owners_housing(
            housing_id,
            owner_id,
            rank
        ) select
            h.id,
            o.id,
            5
        from _extract_zlv_ _e_, housing h, owners o, lateral ( select
                upper(ff_ddenom_5) as owner,
                array_remove(array[nullif(trim(ff_dlign3_5), ''), nullif(trim(ff_dlign4_5), ''), nullif(trim(ff_dlign5_5), ''), nullif(trim(ff_dlign6_5), '')], null) as owner_raw_address,
                (case when ff_jdatnss_5 <> '0' and ff_jdatnss_5 not like '00/00/%' and ff_jdatnss_5 not like '%/%/18%' then to_date(ff_jdatnss_5 || ' 20', date_format) end) as birth_date
            ) var
        where _e_.ff_idlocal = h.local_id
          and ff_ccthp in ('V', 'L', 'P')
          and ff_ddenom_5 is not null
          and o.full_name = upper(var.owner)
          and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
          and not exists(
              select * from owners_housing oh where oh.housing_id = h.id and (oh.owner_id = o.id or rank = 1)
          )
        group by h.id, o.id;

        insert into owners_housing(
            housing_id,
            owner_id,
            rank
        ) select
            h.id,
            o.id,
            4
        from _extract_zlv_ _e_, housing h, owners o, lateral ( select
                upper(ff_ddenom_4) as owner,
                array_remove(array[nullif(trim(ff_dlign3_4), ''), nullif(trim(ff_dlign4_4), ''), nullif(trim(ff_dlign5_4), ''), nullif(trim(ff_dlign6_4), '')], null) as owner_raw_address,
                (case when ff_jdatnss_4 <> '0' and ff_jdatnss_4 not like '00/00/%' and ff_jdatnss_4 not like '%/%/18%' then to_date(ff_jdatnss_4 || ' 20', date_format) end) as birth_date
            ) var
        where _e_.ff_idlocal = h.local_id
          and ff_ccthp in ('V', 'L', 'P')
          and ff_ddenom_4 is not null
          and o.full_name = upper(var.owner)
          and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
          and not exists(
              select * from owners_housing oh where oh.housing_id = h.id and (oh.owner_id = o.id or rank = 1)
          )
        group by h.id, o.id;

        insert into owners_housing(
            housing_id,
            owner_id,
            rank
        ) select
            h.id,
            o.id,
            3
        from _extract_zlv_ _e_, housing h, owners o, lateral ( select
                upper(ff_ddenom_3) as owner,
                array_remove(array[nullif(trim(ff_dlign3_3), ''), nullif(trim(ff_dlign4_3), ''), nullif(trim(ff_dlign5_3), ''), nullif(trim(ff_dlign6_3), '')], null) as owner_raw_address,
                (case when ff_jdatnss_3 <> '0' and ff_jdatnss_3 not like '00/00/%' and ff_jdatnss_3 not like '%/%/18%' then to_date(ff_jdatnss_3 || ' 20', date_format) end) as birth_date
            ) var
        where _e_.ff_idlocal = h.local_id
          and ff_ccthp in ('V', 'L', 'P')
          and ff_ddenom_3 is not null
          and o.full_name = upper(var.owner)
          and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
          and not exists(
              select * from owners_housing oh where oh.housing_id = h.id and (oh.owner_id = o.id or rank = 1)
          )
        group by h.id, o.id;

        insert into owners_housing(
            housing_id,
            owner_id,
            rank
        ) select
            h.id,
            o.id,
            2
        from _extract_zlv_ _e_, housing h, owners o, lateral ( select
                upper(ff_ddenom_2) as owner,
                array_remove(array[nullif(trim(ff_dlign3_2), ''), nullif(trim(ff_dlign4_2), ''), nullif(trim(ff_dlign5_2), ''), nullif(trim(ff_dlign6_2), '')], null) as owner_raw_address,
                (case when ff_jdatnss_2 <> '0' and ff_jdatnss_2 not like '00/00/%' and ff_jdatnss_2 not like '%/%/18%' then to_date(ff_jdatnss_2 || ' 20', date_format) end) as birth_date
            ) var
        where _e_.ff_idlocal = h.local_id
          and ff_ccthp in ('V', 'L', 'P')
          and ff_ddenom_2 is not null
          and o.full_name = upper(var.owner)
          and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
          and not exists(
              select * from owners_housing oh where oh.housing_id = h.id and (oh.owner_id = o.id or rank = 1)
          )
        group by h.id, o.id;

        insert into owners_housing(
            housing_id,
            owner_id,
            rank
        ) select
            h.id,
            o.id,
            1
        from _extract_zlv_ _e_, housing h, owners o, lateral (
            select (case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) as owner,
                   array_remove(array[nullif(trim(adresse1), ''), nullif(trim(adresse2), ''), nullif(trim(adresse3), ''), nullif(trim(adresse4), '')], null) as owner_raw_address,
                   (case when ff_jdatnss_1 <> '0' and ff_jdatnss_1 not like '00/00/%' and ff_jdatnss_1 not like '%/%/18%' and (
                       ((case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') or
                       ((case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%')) then to_date(ff_jdatnss_1 || ' 20', date_format) end) as birth_date
            ) var
        where _e_.ff_idlocal = h.local_id
          and ff_ccthp in ('V', 'L', 'P')
          and o.full_name = upper(var.owner)
          and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
          and not exists(
             select * from owners_housing oh where oh.housing_id = h.id and (oh.owner_id = o.id or rank = 1)
          )
        group by h.id, o.id;


        --  TODO CASE OF UPDATING OWNER
        --                 ELSIF not owner_var_ids @> ARRAY[owner_housing_var.owner_id] AND owner_housing_var.max_date IS NOT NULL AND owner_housing_var.max_date::date > to_date('01/01/2021', 'DD/MM/YYYY') THEN
        --
        --                     --RAISE NOTICE 'IGNORE NEW DATA: %', housing_var.local_id;
        --
        --                     insert into events(owner_id, housing_id, kind, created_at, content)
        --                     values (owner_housing_var.owner_id, housing_var_id, 3, current_timestamp,
        --                             'Propriétaire du nouveau millésime non pris en compte : '
        --                                 || housing_var.full_name
        --                                 || coalesce(' - ' || to_char(housing_var.birth_date, 'DD/MM/YYYY'), '')
        --                                 || coalesce(' - ' || array_to_string(housing_var.owner_raw_address, ', '), '') );
        --
        --                 ELSIF not owner_var_ids @> ARRAY[owner_housing_var.owner_id] THEN
        --
        --                     --RAISE NOTICE 'UPDATE OWNER HOUSING WITH NEW DATA: %', housing_var.local_id;
        --
        --                     select * into owner_var from owners where id = owner_housing_var.owner_id;
        --
        --                     update owners_housing set owner_id = owner_var_ids[1] where housing_id = housing_var_id and rank = 1;
        --
        --                     insert into events(owner_id, housing_id, kind, created_at, content)
        --                     values (owner_var_ids[1], housing_var_id, 3, current_timestamp,
        --                             'Propriétaire avant prise en compte du nouveau millésime : '
        --                                 || owner_var.full_name
        --                                 || coalesce(' - ' || to_char(owner_var.birth_date, 'DD/MM/YYYY'), '')
        --                                 || coalesce(' - ' || array_to_string(owner_var.raw_address, ', '), '') );
        --
        --                 ELSE

    END;
$$;
