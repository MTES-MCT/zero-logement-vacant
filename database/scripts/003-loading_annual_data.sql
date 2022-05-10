CREATE OR REPLACE PROCEDURE load_housing ()
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
           lpad(ccodep, 2, '0') || lpad(commune, 3, '0') as insee_code,
           ff_x_4326 as latitude,
    --        replace(ff_x_4326, ',', '.')::double precision as latitude,
           ff_y_4326 as longitude,
    --        replace(ff_y_4326, ',', '.')::double precision as longitude,
           ff_dcapec2 as cadastral_classification,
           (coalesce(ff_dcapec2, 0) > 6) OR (ff_dnbwc = 0) OR (ff_dnbbai + ff_dnbdou = 0) as uncomfortable,
           debutvacance as vacancy_start_year,
           trim(nature) as housing_kind,
           ff_npiece_p2 as rooms_count,
           ff_stoth as living_area,
           refcad as cadastral_reference,
           (case when (ff_jannath > 100) then ff_jannath end) as building_year,
           (case
               when (anmutation like '%/%/%') then to_date(anmutation, 'MM/DD/YY')
               else to_date('01/01/' || anmutation, 'MM/DD/YY')  end) as mutation_date,
           trim(txtlv) <> '' as taxed,
           annee as data_year,
           ff_ndroit as beneficiary_count,
           trim(batloc) as building_location,
           trim(vlcad) as rental_value,
           trim(ff_ctpdl) as ownership_kind,
           upper(var.owner) as full_name,
           var.administrator as administrator,
           array[nullif(trim(adresse1), ''), nullif(trim(adresse2), ''), nullif(trim(adresse3), ''), nullif(trim(adresse4), '')] as owner_raw_address,
           (case
               when ff_jdatnss_1 <> '0' and ff_jdatnss_1 not like '00/00/%' and ff_jdatnss_1 not like '%/%/18%' and (
                   (var.owner like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') or
                   (var.owner like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%')) then to_date(ff_jdatnss_1, 'MM/DD/YYYY') end) as birth_date,
           (case
               when trim(groupe::text) = '' then 'Particulier'
               when not(var.owner like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') and
                    not(var.owner like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%') then 'Autre'
               when ff_catpro2txt = 'INVESTISSEUR PROFESSIONNEL' then 'Investisseur'
               when ff_catpro2txt = 'SOCIETE CIVILE A VOCATION IMMOBILIERE' then 'SCI'
               else 'Autre' end) as owner_kind,
           (case
               when trim(groupe::text) = '' then 'Particulier'
               when not(var.owner like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') and
                    not(var.owner like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%') then 'Autre'
               when ff_catpro2txt = 'INVESTISSEUR PROFESSIONNEL' then 'Investisseur'
               when ff_catpro2txt = 'SOCIETE CIVILE A VOCATION IMMOBILIERE' then 'SCI'
               else ff_catpro2txt end) as owner_kind_detail,
           array_agg(distinct(ff_idlocal)) as local_ids
        from _extract_zlv_2022_5, lateral (
                select (case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) as owner,
                       (case when trim(proprietaire) <> '' then trim(gestre_ppre) end) as administrator) var
        where ff_ccthp in ('V', 'L', 'P')
        and ff_idlocal is not null
        and owner is not null
        group by invariant, local_id, building_id, raw_address, insee_code, latitude, longitude, cadastral_classification, uncomfortable, vacancy_start_year,
                 housing_kind, rooms_count, living_area, cadastral_reference, building_year, mutation_date, taxed, annee, ff_ndroit, ff_ndroit, batloc, vlcad, ff_ctpdl,
                 owner, administrator, birth_date, adresse1, adresse2, adresse3, adresse4, ff_ddenom_1, owner_kind, owner_kind_detail;

    BEGIN

        OPEN housing_cursor;

        update _extract_zlv_2022_5 set anmutation = '01/01/' || substr(anmutation, 3) where anmutation ~ '[0-9]{4}';

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

                    RAISE NOTICE 'INSERT HOUSING : %', housing_var.local_id;

                    insert into housing (invariant, local_id, building_id, raw_address, insee_code, latitude, longitude, cadastral_classification,
                        uncomfortable, vacancy_start_year, housing_kind, rooms_count, living_area, cadastral_reference,
                        building_year, mutation_date, taxed, data_years, beneficiary_count, building_location, rental_value, ownership_kind)
                    values (housing_var.invariant, housing_var.local_id, housing_var.building_id, housing_var.raw_address,
                            housing_var.insee_code, housing_var.latitude, housing_var.longitude, housing_var.cadastral_classification,
                            housing_var.uncomfortable, housing_var.vacancy_start_year::integer, housing_var.housing_kind, housing_var.rooms_count,
                            housing_var.living_area, housing_var.cadastral_reference, housing_var.building_year, housing_var.mutation_date,
                            housing_var.taxed, ARRAY[housing_var.data_year], housing_var.beneficiary_count, housing_var.building_location,
                            housing_var.rental_value::integer, housing_var.ownership_kind)
                    returning housing.id INTO housing_var_id;


                -- CASE EXISTING HOUSING
                ELSE

                    RAISE NOTICE 'UPDATE DATA YEARS : %', housing_var.local_id;

                    update housing h set data_years = array_prepend(housing_var.data_year, h.data_years)
                    where h.id = housing_var_id
                    and not(h.data_years @> ARRAY[housing_var.data_year]);

                END IF;


                --------------------------------
                -- OWNER
                --------------------------------
                select array_agg(id) into owner_var_ids from owners o
                where o.full_name = upper(trim(housing_var.full_name))
                  and (o.birth_date = housing_var.birth_date OR coalesce(o.birth_date, housing_var.birth_date) IS NULL);

                -- CASE NEW OWNER
                IF owner_var_ids IS NULL or array_length(owner_var_ids, 1) = 0 THEN

                    RAISE NOTICE 'INSERT OWNER : % - %', housing_var.full_name, housing_var.birth_date ;

                    insert into owners(full_name, administrator, raw_address, birth_date, owner_kind, owner_kind_detail, local_ids)
                    values(housing_var.full_name, housing_var.administrator, housing_var.raw_address, housing_var.birth_date,
                           housing_var.owner_kind, housing_var.owner_kind_detail, housing_var.local_ids)
                           returning ARRAY[id] INTO owner_var_ids;

                END IF;


                --------------------------------
                -- OWNER HOUSING
                --------------------------------
                select oh.owner_id, max(e.created_at) as max_date into owner_housing_var
                from owners_housing oh
                left outer join events e on oh.owner_id = e.owner_id and e.kind = '0'
                where oh.housing_id = housing_var_id
                group by oh.owner_id;

                IF owner_housing_var.owner_id IS NULL THEN

                    RAISE NOTICE 'INSERT OWNER HOUSING : %', housing_var.local_id;

                    insert into owners_housing(housing_id, owner_id) values (housing_var_id, owner_var_ids[1]);

                ELSIF not owner_var_ids @> ARRAY[owner_housing_var.owner_id] AND owner_housing_var.max_date IS NOT NULL AND owner_housing_var.max_date::date > to_date('01/01/2021', 'DD/MM/YYYY') THEN

                    RAISE NOTICE 'IGNORE NEW DATA: %', housing_var.local_id;

                    insert into events(owner_id, housing_id, kind, created_at, content)
                    values (owner_housing_var.owner_id, housing_var_id, 3, current_timestamp,
                            'Propriétaire du nouveau millésime non pris en compte : '
                                || housing_var.full_name
                                || coalesce(' - ' || to_char(housing_var.birth_date, 'DD/MM/YYYY'), '')
                                || coalesce(' - ' || array_to_string(housing_var.owner_raw_address, ', '), '') );

                ELSIF not owner_var_ids @> ARRAY[owner_housing_var.owner_id] THEN

                    RAISE NOTICE 'UPDATE OWNER HOUSING WITH NEW DATA: %', housing_var.local_id;

                    select * into owner_var from owners where id = owner_housing_var.owner_id;

                    update owners_housing set owner_id = owner_var_ids[1] where housing_id = housing_var_id;

                    update owners set local_ids = array_remove(local_ids::text[], housing_var.local_id) where id = owner_housing_var.owner_id;
                    update owners set local_ids = array_prepend(housing_var.local_id, local_ids::text[]) where id = owner_var_ids[1];

                    insert into events(owner_id, housing_id, kind, created_at, content)
                    values (owner_var_ids[1], housing_var_id, 3, current_timestamp,
                            'Propriétaire avant prise en compte du nouveau millésime : '
                                || owner_var.full_name
                                || coalesce(' - ' || to_char(owner_var.birth_date, 'DD/MM/YYYY'), '')
                                || coalesce(' - ' || array_to_string(owner_var.raw_address, ', '), '') );

                ELSE

                    RAISE NOTICE 'NO CHANGES: %', housing_var.local_id;

                END IF;

            END IF;

        END LOOP;

        CLOSE housing_cursor;

    END;
$$



