CREATE OR REPLACE PROCEDURE load_owner (owner_var record, rank integer)
LANGUAGE plpgsql
AS $$

    DECLARE
        owner_var_ids uuid[];
        owner_housing_var record;

    BEGIN

        IF owner_var.local_id IS NOT NULL THEN

            --------------------------------
            -- OWNER
            --------------------------------
            select array_agg(id) into owner_var_ids from owners o
            where o.full_name = upper(trim(owner_var.full_name))
              and (o.birth_date = owner_var.birth_date OR (coalesce(o.birth_date, owner_var.birth_date) IS NULL AND o.raw_address && owner_var.owner_raw_address));

            -- CASE NEW OWNER
            IF owner_var_ids IS NULL or array_length(owner_var_ids, 1) = 0 THEN

                RAISE NOTICE 'INSERT OWNER : % - %', owner_var.full_name, owner_var.birth_date ;

                insert into owners(full_name, raw_address, birth_date, local_ids)
                values(owner_var.full_name, owner_var.owner_raw_address, owner_var.birth_date, owner_var.local_ids)
                       returning ARRAY[id] INTO owner_var_ids;

            END IF;

            --------------------------------
            -- OWNER HOUSING
            --------------------------------
            select oh.* into owner_housing_var
            from owners_housing oh, housing h
            where oh.housing_id = h.id
            and h.local_id = owner_var.local_id
            and oh.owner_id = owner_var_ids[1];

            IF owner_housing_var.owner_id IS NULL THEN

                RAISE NOTICE 'INSERT OWNER HOUSING : %', owner_var.local_id;

                insert into owners_housing(housing_id, owner_id, rank) select id, owner_var_ids[1], rank from housing where local_id = owner_var.local_id;

            END IF;

        END IF;

    END;
$$;


CREATE OR REPLACE PROCEDURE load_owners ()
LANGUAGE plpgsql
AS $$

    DECLARE
        owner_var record;

        owner_cursor2 CURSOR FOR select
           ff_idlocal as local_id,
           upper(ff_ddenom_2) as full_name,
           array_remove(array[nullif(trim(ff_dlign3_2), ''), nullif(trim(ff_dlign4_2), ''), nullif(trim(ff_dlign5_2), ''), nullif(trim(ff_dlign6_2), '')], null) as owner_raw_address,
           --(case when ff_jdatnss_2 <> '0' and ff_jdatnss_2 not like '00/00/%' and ff_jdatnss_2 not like '%/%/18%' then to_date('1899-12-30', 'YYYY-MM-DD') + interval '1 day' * to_number(ff_jdatnss_2, '99999') end) as birth_date,
           (case when ff_jdatnss_2 <> '0' and ff_jdatnss_2 not like '00/00/%' and ff_jdatnss_2 not like '%/%/18%' then to_date(ff_jdatnss_2 || ' 20', 'MM/DD/YY CC') end) as birth_date,
           array_agg(distinct(ff_idlocal)) as local_ids
        from _extract_zlv_2022_owners_4
        where ff_ccthp in ('V', 'L', 'P')
        and ff_idlocal is not null
        and ff_ddenom_2 is not null
        group by local_id, full_name, birth_date, owner_raw_address;

        owner_cursor3 CURSOR FOR select
           ff_idlocal as local_id,
           upper(ff_ddenom_3) as full_name,
           array_remove(array[nullif(trim(ff_dlign3_3), ''), nullif(trim(ff_dlign4_3), ''), nullif(trim(ff_dlign5_3), ''), nullif(trim(ff_dlign6_3), '')], null) as owner_raw_address,
           --(case when ff_jdatnss_3 <> '0' and ff_jdatnss_3 not like '00/00/%' and ff_jdatnss_3 not like '%/%/18%' then to_date('1899-12-30', 'YYYY-MM-DD') + interval '1 day' * to_number(ff_jdatnss_3, '99999') end) as birth_date,
           (case when ff_jdatnss_3 <> '0' and ff_jdatnss_3 not like '00/00/%' and ff_jdatnss_3 not like '%/%/18%' then to_date(ff_jdatnss_3 || ' 20', 'MM/DD/YY CC') end) as birth_date,
           array_agg(distinct(ff_idlocal)) as local_ids
        from _extract_zlv_2022_owners_4
        where ff_ccthp in ('V', 'L', 'P')
        and ff_idlocal is not null
        and ff_ddenom_3 is not null
        group by local_id, full_name, birth_date, owner_raw_address;

        owner_cursor4 CURSOR FOR select
           ff_idlocal as local_id,
           upper(ff_ddenom_4) as full_name,
           array_remove(array[nullif(trim(ff_dlign3_4), ''), nullif(trim(ff_dlign4_4), ''), nullif(trim(ff_dlign5_4), ''), nullif(trim(ff_dlign6_4), '')], null) as owner_raw_address,
           --(case when ff_jdatnss_4 <> '0' and ff_jdatnss_4 not like '00/00/%' and ff_jdatnss_4 not like '%/%/18%' then to_date('1899-12-30', 'YYYY-MM-DD') + interval '1 day' * to_number(ff_jdatnss_4, '99999') end) as birth_date,
           (case when ff_jdatnss_4 <> '0' and ff_jdatnss_4 not like '00/00/%' and ff_jdatnss_4 not like '%/%/18%' then to_date(ff_jdatnss_4 || ' 20', 'MM/DD/YY CC') end) as birth_date,
           array_agg(distinct(ff_idlocal)) as local_ids
        from _extract_zlv_2022_owners_4
        where ff_ccthp in ('V', 'L', 'P')
        and ff_idlocal is not null
        and ff_ddenom_4 is not null
        group by local_id, full_name, birth_date, owner_raw_address;

        owner_cursor5 CURSOR FOR select
           ff_idlocal as local_id,
           upper(ff_ddenom_5) as full_name,
           array_remove(array[nullif(trim(ff_dlign3_5), ''), nullif(trim(ff_dlign4_5), ''), nullif(trim(ff_dlign5_5), ''), nullif(trim(ff_dlign6_5), '')], null) as owner_raw_address,
           --(case when ff_jdatnss_5 <> '0' and ff_jdatnss_5 not like '00/00/%' and ff_jdatnss_5 not like '%/%/18%' then to_date('1899-12-30', 'YYYY-MM-DD') + interval '1 day' * to_number(ff_jdatnss_5, '99999') end) as birth_date,
           (case when ff_jdatnss_5 <> '0' and ff_jdatnss_5 not like '00/00/%' and ff_jdatnss_5 not like '%/%/18%' then to_date(ff_jdatnss_5 || ' 20', 'MM/DD/YY CC') end) as birth_date,
           array_agg(distinct(ff_idlocal)) as local_ids
        from _extract_zlv_2022_owners_4
        where ff_ccthp in ('V', 'L', 'P')
        and ff_idlocal is not null
        and ff_ddenom_5 is not null
        group by local_id, full_name, birth_date, owner_raw_address;

        owner_cursor6 CURSOR FOR select
           ff_idlocal as local_id,
           upper(ff_ddenom_6) as full_name,
           array_remove(array[nullif(trim(ff_dlign3_6), ''), nullif(trim(ff_dlign4_6), ''), nullif(trim(ff_dlign5_6), ''), nullif(trim(ff_dlign6_6), '')], null) as owner_raw_address,
           --(case when ff_jdatnss_6 <> '0' and ff_jdatnss_6 not like '00/00/%' and ff_jdatnss_6 not like '%/%/18%' then to_date('1899-12-30', 'YYYY-MM-DD') + interval '1 day' * to_number(ff_jdatnss_6, '99999') end) as birth_date,
           (case when ff_jdatnss_6 <> '0' and ff_jdatnss_6 not like '00/00/%' and ff_jdatnss_6 not like '%/%/18%' then to_date(ff_jdatnss_6 || ' 20', 'MM/DD/YY CC') end) as birth_date,
           array_agg(distinct(ff_idlocal)) as local_ids
        from _extract_zlv_2022_owners_4
        where ff_ccthp in ('V', 'L', 'P')
        and ff_idlocal is not null
        and ff_ddenom_6 is not null
        group by local_id, full_name, birth_date, owner_raw_address;

    BEGIN

        OPEN owner_cursor2;
        LOOP
            FETCH owner_cursor2 INTO owner_var;
            EXIT WHEN NOT FOUND;
            call load_owner(owner_var, 2);
        END LOOP;
        CLOSE owner_cursor2;

        OPEN owner_cursor3;
        LOOP
            FETCH owner_cursor3 INTO owner_var;
            EXIT WHEN NOT FOUND;
            call load_owner(owner_var, 3);
        END LOOP;
        CLOSE owner_cursor3;

        OPEN owner_cursor4;
        LOOP
            FETCH owner_cursor4 INTO owner_var;
            EXIT WHEN NOT FOUND;
            call load_owner(owner_var, 4);
        END LOOP;
        CLOSE owner_cursor4;

        OPEN owner_cursor5;
        LOOP
            FETCH owner_cursor5 INTO owner_var;
            EXIT WHEN NOT FOUND;
            call load_owner(owner_var, 5);
        END LOOP;
        CLOSE owner_cursor5;

        OPEN owner_cursor6;
        LOOP
            FETCH owner_cursor6 INTO owner_var;
            EXIT WHEN NOT FOUND;
            call load_owner(owner_var, 6);
        END LOOP;
        CLOSE owner_cursor6;

    END;
$$
