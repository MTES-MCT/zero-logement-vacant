CREATE OR REPLACE PROCEDURE load_owner (
    _full_name text,
    _administrator text,
    _birth_date date,
    _raw_address text[],
    _owner_kind text,
    _owner_kind_detail text,
    _housing_id uuid,
    _housing_geo_code text,
    _rank integer
)
LANGUAGE plpgsql
AS $$

    DECLARE
        owner_var_ids uuid[];
        owner_housing_var record;

    BEGIN

        IF _full_name IS NOT NULL THEN

            --------------------------------
            -- OWNER
            --------------------------------
            select array_agg(id) into owner_var_ids from owners o
            where o.full_name = upper(trim(_full_name))
              and (o.birth_date = _birth_date OR (coalesce(o.birth_date, _birth_date) IS NULL AND o.raw_address && _raw_address));

            -- CASE NEW OWNER
            IF owner_var_ids IS NULL or array_length(owner_var_ids, 1) = 0 THEN

                INSERT INTO owners(full_name, administrator, raw_address, birth_date, owner_kind, owner_kind_detail)
                VALUES(_full_name, _administrator, _raw_address, _birth_date, _owner_kind, _owner_kind_detail)
                       returning ARRAY[id] INTO owner_var_ids;

            END IF;

            --------------------------------
            -- OWNER HOUSING
            --------------------------------
            INSERT INTO owners_housing(housing_id, housing_geo_code, owner_id, rank, origin) VALUES (_housing_id, _housing_geo_code, owner_var_ids[1], _rank, 'Lovac')
            ON CONFLICT DO NOTHING;

        END IF;

    END;
$$;

CREATE OR REPLACE PROCEDURE load_housing (date_format text)
LANGUAGE plpgsql
AS $$

    DECLARE
        housing_var record;
        housing_var_id uuid;
        owner_var record;
        owner_var_ids uuid[];
        owner_housing_var record;
        housing_cursor CURSOR FOR select
           invariant,
           ff_idlocal as local_id,
           ff_idbat as building_id,
           array[ltrim(trim(libvoie), '0'), trim(libcom)] as raw_address,
           lpad(ccodep, 2, '0') || lpad(commune, 3, '0') as geo_code,
           replace(ff_y_4326, ',', '.')::double precision as latitude,
           replace(ff_x_4326, ',', '.')::double precision as longitude,
           ff_dcapec2 as cadastral_classification,
           (coalesce(ff_dcapec2, 0) > 6) OR (ff_dnbwc = 0) OR (ff_dnbbai + ff_dnbdou = 0) as uncomfortable,
           debutvacance as vacancy_start_year,
           trim(nature) as housing_kind,
           ff_npiece_p2 as rooms_count,
           floor(replace(ff_stoth, ',', '.')::numeric) as living_area,
           refcad as cadastral_reference,
           (case when (ff_jannath > 100) then ff_jannath end) as building_year,
           (case
               when (anmutation like '%/%/%') then to_date(anmutation, date_format)
               else to_date('01/01/' || anmutation, date_format)  end) as mutation_date,
           trim(txtlv) <> '' as taxed,
           annee as data_year,
           ff_ndroit as beneficiary_count,
           trim(batloc) as building_location,
           trim(vlcad) as rental_value,
           trim(ff_ctpdl) as ownership_kind,
           upper(var.owner) as full_name,
           var.administrator as administrator,
           array_remove(array[nullif(trim(adresse1), ''), nullif(trim(adresse2), ''), nullif(trim(adresse3), ''), nullif(trim(adresse4), '')], null) as owner_raw_address,
           (case
               when ff_jdatnss_1 <> '0' and ff_jdatnss_1 not like '00/%/%' and ff_jdatnss_1 not like '%/%/18%' and (
                   (var.owner like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') or
                   (var.owner like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%')) then to_date(ff_jdatnss_1 || ' 20', date_format) end) as birth_date,
           (case
               when trim(groupe::TEXT) = '' then 'Particulier'
               when not(var.owner like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') and
                    not(var.owner like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%') then 'Autre'
               when ff_catpro2txt = 'INVESTISSEUR PROFESSIONNEL' then 'Investisseur'
               when ff_catpro2txt = 'SOCIETE CIVILE A VOCATION IMMOBILIERE' then 'SCI'
               else 'Autre' end) as owner_kind,
           (case
               when trim(groupe::TEXT) = '' then 'Particulier'
               when not(var.owner like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') and
                    not(var.owner like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%') then 'Autre'
               when ff_catpro2txt = 'INVESTISSEUR PROFESSIONNEL' then 'Investisseur'
               when ff_catpro2txt = 'SOCIETE CIVILE A VOCATION IMMOBILIERE' then 'SCI'
               else ff_catpro2txt end) as owner_kind_detail,
           upper(ff_ddenom_2) as full_name2,
           array_remove(array[nullif(trim(ff_dlign3_2), ''), nullif(trim(ff_dlign4_2), ''), nullif(trim(ff_dlign5_2), ''), nullif(trim(ff_dlign6_2), '')], null) as owner_raw_address2,
           (case when ff_jdatnss_2 <> '0' and ff_jdatnss_2 not like '00/%/%' and ff_jdatnss_2 not like '%/%/18%' then to_date(ff_jdatnss_2 || ' 20', date_format) end) as birth_date2,
           upper(ff_ddenom_3) as full_name3,
           array_remove(array[nullif(trim(ff_dlign3_3), ''), nullif(trim(ff_dlign4_3), ''), nullif(trim(ff_dlign5_3), ''), nullif(trim(ff_dlign6_3), '')], null) as owner_raw_address3,
           (case when ff_jdatnss_3 <> '0' and ff_jdatnss_3 not like '00/%/%' and ff_jdatnss_3 not like '%/%/18%' then to_date(ff_jdatnss_3 || ' 20', date_format) end) as birth_date3,
           upper(ff_ddenom_4) as full_name4,
           array_remove(array[nullif(trim(ff_dlign3_4), ''), nullif(trim(ff_dlign4_4), ''), nullif(trim(ff_dlign5_4), ''), nullif(trim(ff_dlign6_4), '')], null) as owner_raw_address4,
           (case when ff_jdatnss_4 <> '0' and ff_jdatnss_4 not like '00/%/%' and ff_jdatnss_4 not like '%/%/18%' then to_date(ff_jdatnss_4 || ' 20', date_format) end) as birth_date4,
           upper(ff_ddenom_5) as full_name5,
           array_remove(array[nullif(trim(ff_dlign3_5), ''), nullif(trim(ff_dlign4_5), ''), nullif(trim(ff_dlign5_5), ''), nullif(trim(ff_dlign6_5), '')], null) as owner_raw_address5,
           (case when ff_jdatnss_5 <> '0' and ff_jdatnss_5 not like '00/%/%' and ff_jdatnss_5 not like '%/%/18%' then to_date(ff_jdatnss_5 || ' 20', date_format) end) as birth_date5,
           upper(ff_ddenom_6) as full_name6,
           array_remove(array[nullif(trim(ff_dlign3_6), ''), nullif(trim(ff_dlign4_6), ''), nullif(trim(ff_dlign5_6), ''), nullif(trim(ff_dlign6_6), '')], null) as owner_raw_address6,
           (case when ff_jdatnss_6 <> '0' and ff_jdatnss_6 not like '00/%/%' and ff_jdatnss_6 not like '%/%/18%' then to_date(ff_jdatnss_6 || ' 20', date_format) end) as birth_date6
        from _extract_zlv_, lateral (
                select (case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) as owner,
                       (case when trim(proprietaire) <> '' then trim(gestre_ppre) end) as administrator) var
        where ff_ccthp in ('V')
        and groupe not in ('1','2','3','4','5','6','9')
        and aff='H'
        and upper(nature) in ('APPART','MAISON')
        and ff_idlocal is not null
        and owner is not null
        group by invariant, local_id, building_id, raw_address, geo_code, latitude, longitude, cadastral_classification, uncomfortable, vacancy_start_year,
                 housing_kind, rooms_count, living_area, cadastral_reference, building_year, mutation_date, taxed, annee, ff_ndroit, ff_ndroit, batloc, vlcad, ff_ctpdl,
                 owner, administrator, birth_date, adresse1, adresse2, adresse3, adresse4, ff_ddenom_1, owner_kind, owner_kind_detail,
                 full_name2, birth_date2, owner_raw_address2, full_name3, birth_date3, owner_raw_address3, full_name3, birth_date3, owner_raw_address3,
                 full_name4, birth_date4, owner_raw_address4, full_name5, birth_date5, owner_raw_address5, full_name6, birth_date6, owner_raw_address6;

    BEGIN

        -- Disabling useless indexes to improve perf
        DROP INDEX housing_geo_code_idx;
        DROP INDEX housing_geo_code_data_years_idx;

        OPEN housing_cursor;

        RAISE NOTICE 'START LOOP';

        LOOP
            FETCH housing_cursor INTO housing_var;
            EXIT WHEN NOT FOUND;

            IF housing_var.local_id IS NOT NULL THEN

                --------------------------------
                -- HOUSING
                --------------------------------
                SELECT id INTO housing_var_id FROM housing where local_id = housing_var.local_id;

                -- CASE NEW HOUSING
                IF housing_var_id IS NULL THEN

                    insert into fast_housing (id, invariant, local_id, building_id, raw_address, geo_code, latitude, longitude, cadastral_classification,
                        uncomfortable, vacancy_start_year, housing_kind, rooms_count, living_area, cadastral_reference,
                        building_year, mutation_date, taxed, data_years, beneficiary_count, building_location, rental_value, ownership_kind, occupancy, occupancy_registered, status)
                    values (gen_random_uuid(), housing_var.invariant, housing_var.local_id, housing_var.building_id, housing_var.raw_address,
                            housing_var.geo_code, housing_var.latitude, housing_var.longitude, housing_var.cadastral_classification,
                            housing_var.uncomfortable, housing_var.vacancy_start_year::INTEGER, housing_var.housing_kind, housing_var.rooms_count,
                            housing_var.living_area, housing_var.cadastral_reference, housing_var.building_year, housing_var.mutation_date,
                            housing_var.taxed, ARRAY[housing_var.data_year], housing_var.beneficiary_count, housing_var.building_location,
                            housing_var.rental_value::INTEGER, housing_var.ownership_kind, 'V', 'V', 0)
                    returning fast_housing.id INTO housing_var_id;


                -- CASE EXISTING HOUSING
                ELSE

                    update housing h set data_years = array_prepend(housing_var.data_year, h.data_years)
                    where h.id = housing_var_id
                    and not(h.data_years @> ARRAY[housing_var.data_year]);

                END IF;


                --------------------------------
                -- OWNERS
                --------------------------------
                call load_owner(housing_var.full_name, housing_var.administrator, housing_var.birth_date, housing_var.owner_raw_address, housing_var.owner_kind, housing_var.owner_kind_detail, housing_var_id, housing_var.geo_code, 1);
                call load_owner(housing_var.full_name, housing_var.administrator, housing_var.birth_date, housing_var.owner_raw_address, housing_var.owner_kind, housing_var.owner_kind_detail, housing_var_id, housing_var.geo_code, -2);
                call load_owner(housing_var.full_name2, null, housing_var.birth_date2, housing_var.owner_raw_address2, null, null, housing_var_id, housing_var.geo_code, 2);
                call load_owner(housing_var.full_name3, null, housing_var.birth_date3, housing_var.owner_raw_address3, null, null, housing_var_id, housing_var.geo_code, 3);
                call load_owner(housing_var.full_name4, null, housing_var.birth_date4, housing_var.owner_raw_address4, null, null, housing_var_id, housing_var.geo_code, 4);
                call load_owner(housing_var.full_name5, null, housing_var.birth_date5, housing_var.owner_raw_address5, null, null, housing_var_id, housing_var.geo_code, 5);
                call load_owner(housing_var.full_name6, null, housing_var.birth_date6, housing_var.owner_raw_address6, null, null, housing_var_id, housing_var.geo_code, 6);

            END IF;

        END LOOP;

        CLOSE housing_cursor;

        -- Restore indexes
        CREATE INDEX housing_geo_code_idx on housing (geo_code);
        CREATE INDEX housing_geo_code_data_years_idx on housing (geo_code, data_years);

    END;
$$



