insert into housing(invariant, local_id, building_id, raw_address, insee_code, latitude, longitude, cadastral_classification,
                    uncomfortable, vacancy_start_year, housing_kind, rooms_count, living_area, cadastral_reference,
                    building_year, mutation_date, taxed)
select
       invariant,
       ff_idlocal as local_id,
       ff_idbat as building_id,
       array[ltrim(trim(libvoie), '0'), trim(libcom)] as raw_address,
       codecom as insee_code,
       ff_x_4326 as latitude,
       ff_y_4326 as longitude,
       ff_dcapec2 as cadastral_classification,
       (ff_dcapec2 > 6) OR (ff_dnbwc = 0) OR (ff_dnbbai + ff_dnbdou = 0) as uncomfortable,
       debutvacance as vacancy_start_year,
       trim(nature) as housing_kind,
       ff_npiece_p2 as rooms_count,
       ff_stoth as living_area,
       refcad as cadastral_reference,
       (case when (ff_jannath > 100) then ff_jannath end) as building_year,
       to_date(anmutation, 'M/D/YY') as mutation_date,
       trim(txtlv) <> '' as taxed
from _extract_zlv
where ff_ccthp in ('V', 'L', 'P')
group by invariant, local_id, building_id, raw_address, insee_code, latitude, longitude, cadastral_classification, uncomfortable, vacancy_start_year,
         housing_kind, rooms_count, living_area, cadastral_reference, building_year, mutation_date, taxed;

insert into owners(full_name, administrator, raw_address, birth_date, owner_kind, owner_kind_detail, beneficiary_count, local_ids)
    select
           var.owner,
           var.administrator,
           array[trim(adresse1), trim(adresse2), trim(adresse3), trim(adresse4)],
           (case
               when ff_jdatnss <> '0' and ff_jdatnss <> '00/00/0000' and (
                   (var.owner like '%' || split_part(trim(nom_ff), '/', 1) || '%') or
                   (var.owner like '%' || split_part(split_part(trim(nom_ff), '/', 2), ' ', 1) || '%')) then to_date('1899-12-30', 'YYYY-MM-DD') + interval '1 day' * to_number(ff_jdatnss, '99999') end),
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
           array_agg(distinct(ff_idlocal))
    from _extract_zlv, lateral (
        select (case when trim(proprietaire) <> '' then trim(proprietaire) else trim("GESTRE/PPRE") end) as owner,
               (case when trim(proprietaire) <> '' then trim("GESTRE/PPRE") end) as administrator) var
    where ff_ccthp in ('V', 'L', 'P')
    group by (owner, administrator, ff_jdatnss, adresse1, adresse2, adresse3, adresse4, groupe, nom_ff, ff_catpro2txt, ff_ndroit);


insert into owners_housing(owner_id, housing_id)
select o.id, h.id from housing h, owners o, _extract_zlv e
where h.invariant = e.invariant
  and h.local_id = any(o.local_ids)
  and h.local_id = ff_idlocal
  and h.building_id = ff_idbat
  and h.raw_address = array[ltrim(trim(libvoie), '0'), trim(libcom)]
  and h.insee_code = codecom
  and h.latitude = ff_x_4326
  and h.longitude = ff_y_4326
  and h.cadastral_classification = ff_dcapec2
  and h.uncomfortable = ((ff_dcapec2 > 6) OR (ff_dnbwc = 0) OR (ff_dnbbai + ff_dnbdou = 0))
  and h.vacancy_start_year = debutvacance
  and h.housing_kind = trim(nature)
  and h.rooms_count = ff_npiece_p2
  and h.living_area = ff_stoth
  and h.cadastral_reference = refcad
--   and h.building_year = (case when (ff_jannath > 100) then ff_jannath end)
  and h.mutation_date = to_date(anmutation, 'M/D/YY')
  and h.taxed = (trim(txtlv) <> '')
group by o.id, h.id;


