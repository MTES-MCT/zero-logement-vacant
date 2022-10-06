CREATE OR REPLACE PROCEDURE load_housing (date_format text)
LANGUAGE plpgsql
AS $$

    DECLARE

    BEGIN

        insert into housing (
            invariant,
            local_id,
            building_id,
            raw_address,
            insee_code,
            latitude,
            longitude,
            cadastral_classification,
            uncomfortable,
            vacancy_start_year,
            housing_kind,
            rooms_count,
            living_area,
            cadastral_reference,
            building_year,
            mutation_date,
            taxed,
            data_years,
            beneficiary_count,
            building_location,
            rental_value,
            ownership_kind
         )
         select
            invariant,
            ff_idlocal as local_id,
            ff_idbat as building_id,
            array [ltrim(trim(libvoie), '0'), trim(libcom)] as raw_address,
            lpad(ccodep, 2, '0') || lpad(commune, 3, '0') as insee_code,
            replace(ff_x_4326, ',', '.')::double precision as latitude,
            replace(ff_y_4326, ',', '.')::double precision as longitude,
            ff_dcapec2 as cadastral_classification,
            (coalesce(ff_dcapec2, 0) > 6) OR (ff_dnbwc = 0) OR (ff_dnbbai + ff_dnbdou = 0) as uncomfortable,
            debutvacance::integer as vacancy_start_year,
            trim(nature) as housing_kind,
            ff_npiece_p2 as rooms_count,
            floor(replace(ff_stoth, ',', '.')::numeric) as living_area,
            refcad as cadastral_reference,
            (case when (ff_jannath > 100) then ff_jannath end) as building_year,
            (case
                 when (anmutation like '%/%/%') then to_date(anmutation, date_format)
                 else to_date('01/01/' || anmutation, date_format) end) as mutation_date,
            trim(txtlv) <> '' as taxed,
            ARRAY[annee] as data_years,
            ff_ndroit as beneficiary_count,
            trim(batloc) as building_location,
            trim(vlcad)::integer as rental_value,
            trim(ff_ctpdl) as ownership_kind
         from _extract_zlv_, lateral (select (case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) as owner) var
         where ff_ccthp in ('V', 'L', 'P')
           and ff_idlocal is not null
           and owner is not null
           and not exists (select local_id from housing where local_id = ff_idlocal)
         group by invariant, local_id, building_id, raw_address, insee_code, latitude, longitude, cadastral_classification, uncomfortable, vacancy_start_year,
                  housing_kind, rooms_count, living_area, cadastral_reference, building_year, mutation_date, taxed, annee, ff_ndroit, batloc, vlcad, ff_ctpdl,
                  owner;

        update housing h
        set data_years = array_prepend(annee, h.data_years)
        from _extract_zlv_
        where h.local_id = ff_idlocal
          and not(h.data_years @> ARRAY[annee]);

    END;
$$
