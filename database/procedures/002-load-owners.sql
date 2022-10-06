CREATE OR REPLACE PROCEDURE load_owners (date_format text)
LANGUAGE plpgsql
AS $$

    DECLARE

    BEGIN

        insert into owners(
            full_name,
            administrator,
            raw_address,
            birth_date,
            owner_kind,
            owner_kind_detail
        ) select
            upper(var.owner) as full_name,
            var.administrator as administrator,
            var.owner_raw_address as owner_raw_address,
            var.birth_date as birth_date,
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
               else ff_catpro2txt end) as owner_kind_detail
        from _extract_zlv_, lateral (
            select (case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) as owner,
                   (case when trim(proprietaire) <> '' then trim(gestre_ppre) end) as administrator,
                   array_remove(array[nullif(trim(adresse1), ''), nullif(trim(adresse2), ''), nullif(trim(adresse3), ''), nullif(trim(adresse4), '')], null) as owner_raw_address,
                   (case when ff_jdatnss_1 <> '0' and ff_jdatnss_1 not like '00/00/%' and ff_jdatnss_1 not like '%/%/18%' and (
                       ((case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') or
                       ((case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%')) then to_date(ff_jdatnss_1 || ' 20', date_format) end) as birth_date
            ) var
        where ff_ccthp in ('V', 'L', 'P')
           and ff_idlocal is not null
           and var.owner is not null
           and not exists (
               select id from owners o
               where o.full_name = upper(var.owner)
                 and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
        )
        group by owner_raw_address, owner, administrator, birth_date, ff_ddenom_1, owner_kind, owner_kind_detail;

        insert into owners(
            full_name,
            raw_address,
            birth_date
        ) select
           var.owner,
           var.owner_raw_address,
           var.birth_date
        from _extract_zlv_, lateral ( select
                upper(ff_ddenom_2) as owner,
                array_remove(array[nullif(trim(ff_dlign3_2), ''), nullif(trim(ff_dlign4_2), ''), nullif(trim(ff_dlign5_2), ''), nullif(trim(ff_dlign6_2), '')], null) as owner_raw_address,
                (case when ff_jdatnss_2 <> '0' and ff_jdatnss_2 not like '00/00/%' and ff_jdatnss_2 not like '%/%/18%' then to_date(ff_jdatnss_2 || ' 20', date_format) end) as birth_date
            ) var
        where ff_ccthp in ('V', 'L', 'P')
          and ff_idlocal is not null
          and ff_ddenom_2 is not null
          and not exists (
              select id from owners o
              where o.full_name = upper(var.owner)
                and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
        )
        group by var.owner, var.owner_raw_address, var.birth_date;

        insert into owners(
            full_name,
            raw_address,
            birth_date
        ) select
           var.owner,
           var.owner_raw_address,
           var.birth_date
        from _extract_zlv_, lateral ( select
                upper(ff_ddenom_3) as owner,
                array_remove(array[nullif(trim(ff_dlign3_3), ''), nullif(trim(ff_dlign4_3), ''), nullif(trim(ff_dlign5_3), ''), nullif(trim(ff_dlign6_3), '')], null) as owner_raw_address,
                (case when ff_jdatnss_3 <> '0' and ff_jdatnss_3 not like '00/00/%' and ff_jdatnss_3 not like '%/%/18%' then to_date(ff_jdatnss_3 || ' 20', date_format) end) as birth_date
            ) var
        where ff_ccthp in ('V', 'L', 'P')
          and ff_idlocal is not null
          and ff_ddenom_3 is not null
          and not exists (
              select id from owners o
              where o.full_name = upper(var.owner)
                and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
        )
        group by var.owner, var.owner_raw_address, var.birth_date;

        insert into owners(
            full_name,
            raw_address,
            birth_date
        ) select
           var.owner,
           var.owner_raw_address,
           var.birth_date
        from _extract_zlv_, lateral ( select
                upper(ff_ddenom_4) as owner,
                array_remove(array[nullif(trim(ff_dlign3_4), ''), nullif(trim(ff_dlign4_4), ''), nullif(trim(ff_dlign5_4), ''), nullif(trim(ff_dlign6_4), '')], null) as owner_raw_address,
                (case when ff_jdatnss_4 <> '0' and ff_jdatnss_4 not like '00/00/%' and ff_jdatnss_4 not like '%/%/18%' then to_date(ff_jdatnss_4 || ' 20', date_format) end) as birth_date
            ) var
        where ff_ccthp in ('V', 'L', 'P')
          and ff_idlocal is not null
          and ff_ddenom_4 is not null
          and not exists (
              select id from owners o
              where o.full_name = upper(var.owner)
                and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
        )
        group by var.owner, var.owner_raw_address, var.birth_date;

        insert into owners(
            full_name,
            raw_address,
            birth_date
        ) select
           var.owner,
           var.owner_raw_address,
           var.birth_date
        from _extract_zlv_, lateral ( select
                upper(ff_ddenom_5) as owner,
                array_remove(array[nullif(trim(ff_dlign3_5), ''), nullif(trim(ff_dlign4_5), ''), nullif(trim(ff_dlign5_5), ''), nullif(trim(ff_dlign6_5), '')], null) as owner_raw_address,
                (case when ff_jdatnss_5 <> '0' and ff_jdatnss_5 not like '00/00/%' and ff_jdatnss_5 not like '%/%/18%' then to_date(ff_jdatnss_5 || ' 20', date_format) end) as birth_date
            ) var
        where ff_ccthp in ('V', 'L', 'P')
          and ff_idlocal is not null
          and ff_ddenom_5 is not null
          and not exists (
              select id from owners o
              where o.full_name = upper(var.owner)
                and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
        )
        group by var.owner, var.owner_raw_address, var.birth_date;

        insert into owners(
            full_name,
            raw_address,
            birth_date
        ) select
           var.owner,
           var.owner_raw_address,
           var.birth_date
        from _extract_zlv_, lateral ( select
                upper(ff_ddenom_6) as owner,
                array_remove(array[nullif(trim(ff_dlign3_6), ''), nullif(trim(ff_dlign4_6), ''), nullif(trim(ff_dlign5_6), ''), nullif(trim(ff_dlign6_6), '')], null) as owner_raw_address,
                (case when ff_jdatnss_6 <> '0' and ff_jdatnss_6 not like '00/00/%' and ff_jdatnss_6 not like '%/%/18%' then to_date(ff_jdatnss_6 || ' 20', date_format) end) as birth_date
            ) var
        where ff_ccthp in ('V', 'L', 'P')
          and ff_idlocal is not null
          and ff_ddenom_6 is not null
          and not exists (
              select id from owners o
              where o.full_name = upper(var.owner)
                and (o.birth_date = var.birth_date OR (coalesce(o.birth_date, var.birth_date) IS NULL AND o.raw_address && var.owner_raw_address))
        )
        group by var.owner, var.owner_raw_address, var.birth_date;

    END;
$$;
