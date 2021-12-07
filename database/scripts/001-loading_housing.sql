insert into housing(invariant, raw_address, insee_code, latitude, longitude, cadastral_classification,
                    uncomfortable, vacancy_start_year, housing_kind, rooms_count, living_area, cadastral_reference,
                    building_year, mutation_date, taxed)
select
       invariant,
       array[ltrim(trim(libvoie), '0'), trim(libcom)],
       trim(substr(to_char(dir, '999'), 1, 3) || lpad(trim(to_char(territoire, '999')), 3, '0')),
       ff_x_4326,
       ff_y_4326,
       ff_dcapec2,
       (ff_dcapec2 > 6) OR (ff_dnbwc = 0) OR (ff_dnbbai + ff_dnbdou = 0),
       debutvacance,
       trim(nature),
       ff_npiece_p2,
       ff_stoth,
       refcad,
       (case when (ff_jannath > 100) then ff_jannath end),
       to_date(anmutation, 'M/D/YY'),
       trim(txtlv) = ''
from _extract_zlv
where ff_ccthp in ('V', 'L', 'P');

insert into owners(full_name, administrator, raw_address, birth_date, owner_kind, owner_kind_detail, beneficiary_count, invariants)
    select
           var.owner,
           var.administrator,
           array[trim(adresse1), trim(adresse2), trim(adresse3), trim(adresse4)],
           (case
               when ff_jdatnss <> 0 and (
                   (var.owner like '%' || split_part(trim(nom_ff), '/', 1) || '%') or
                   (var.owner like '%' || split_part(split_part(trim(nom_ff), '/', 2), ' ', 1) || '%')) then to_date('1899-12-30', 'YYYY-MM-DD') + interval '1 day' * ff_jdatnss end),
           (case
               when trim(groupe) = '' then 'Particulier'
               when not(var.owner like '%' || split_part(trim(nom_ff), '/', 1) || '%') and
                    not(var.owner like '%' || split_part(split_part(trim(nom_ff), '/', 2), ' ', 1) || '%') then 'Autre'
               when ff_catpro2txt = 'INVESTISSEUR PROFESSIONNEL' then 'Investisseur'
               when ff_catpro2txt = 'SOCIETE CIVILE A VOCATION IMMOBILIERE' then 'SCI'
               else 'Autre' end),
           (case
               when trim(groupe) = '' then 'Particulier'
               when not(var.owner like '%' || split_part(trim(nom_ff), '/', 1) || '%') and
                    not(var.owner like '%' || split_part(split_part(trim(nom_ff), '/', 2), ' ', 1) || '%') then 'Autre'
               when ff_catpro2txt = 'INVESTISSEUR PROFESSIONNEL' then 'Investisseur'
               when ff_catpro2txt = 'SOCIETE CIVILE A VOCATION IMMOBILIERE' then 'SCI'
               else ff_catpro2txt end),
           (case
                when (var.owner like '%' || split_part(trim(nom_ff), '/', 1) || '%') or
                     (var.owner like '%' || split_part(split_part(trim(nom_ff), '/', 2), ' ', 1) || '%') then ff_ndroit end),
           array_agg(distinct(invariant))
    from _extract_zlv, lateral (
        select (case when trim(proprietaire) <> '' then trim(proprietaire) else trim("GESTRE/PPRE") end) as owner,
               (case when trim(proprietaire) <> '' then trim("GESTRE/PPRE") end) as administrator) var
    where ff_ccthp in ('V', 'L', 'P')
    group by (owner, administrator, ff_jdatnss, adresse1, adresse2, adresse3, adresse4, groupe, nom_ff, ff_catpro2txt, ff_ndroit);
