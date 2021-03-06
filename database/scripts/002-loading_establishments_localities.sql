insert into localities (geo_code, name) (
    select lpad(codgeo, 5, '0'), libgeo from _localities
);
insert into localities (geo_code, name) values
    ('69381', 'Lyon 1er Arrondissement'),
    ('69382', 'Lyon 2e Arrondissement'),
    ('69383', 'Lyon 3e Arrondissement'),
    ('69384', 'Lyon 4e Arrondissement'),
    ('69385', 'Lyon 5e Arrondissement'),
    ('69386', 'Lyon 6e Arrondissement'),
    ('69387', 'Lyon 7e Arrondissement'),
    ('69388', 'Lyon 8e Arrondissement'),
    ('69389', 'Lyon 9e Arrondissement');

insert into establishments (siren, name, localities_id) (
    select distinct(epci), libepci, array_agg(l2.id)
    from _localities l1, localities l2
    where lpad(l1.codgeo, 5, '0') = l2.geo_code group by epci, libepci
);

INSERT INTO public.establishments (name, localities_id, available)
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Commune d''Ajaccio', (select array_agg(id) from localities where geo_code='2A004'), true);
INSERT INTO establishments(siren, name, localities_id, available)
VALUES ('251503199', 'SIVU "Auze-Ouest-Cantal"', (select array_agg(id) from localities where geo_code in ('15088', '15182', '15204')), true);
VALUES ('Commune de Brive-la-Gaillarde', (select array_agg(id) from localities where geo_code='19031'), true);
INSERT INTO public.establishments (name, localities_id, available)
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('DDT du Cher', (select array_agg(id) from localities where geo_code like '18%'), true);
VALUES ('Commune de Mulhouse', (select array_agg(id) from localities where geo_code='68224'), true);
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Commune de Vire Normandie', (select array_agg(id) from localities where geo_code='14762'), true);
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Commune de Roubaix', (select array_agg(id) from localities where geo_code='59512'), true);
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Département de la Meuse', (select array_agg(id) from localities where geo_code like '55%'), true);
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Commune de Fort de France', (select array_agg(id) from localities where geo_code='97209'), true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('ADIL du Doubs', (select array_agg(id) from localities where geo_code like '25%'), '341096394', true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Mantes-la-Jolie', (select array_agg(id) from localities where geo_code = '78361'), 217803618, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Montclar', (select array_agg(id) from localities where geo_code = '04126'), 210401261, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Bastia', (select array_agg(id) from localities where geo_code = '2B033'), 212000335, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('DDTM Pas-de-Calais', (select array_agg(id) from localities where geo_code like '62%'), 130010366, true);
VALUES ('Commune de Cayenne', (select array_agg(id) from localities where geo_code = '97302'), 219733029, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Thann', (select array_agg(id) from localities where geo_code = '68334'), 216803346, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Craponne-sur-Arzon', (select array_agg(id) from localities where geo_code = '43080'), 214300808, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Dun-sur-Auron', (select array_agg(id) from localities where geo_code = '18087'), 211800875, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Rostrenen', (select array_agg(id) from localities where geo_code = '22266'), 212202667, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Castelnau-Magnoac', (select array_agg(id) from localities where geo_code = '65129'), 216501296, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune d’Arras', (select array_agg(id) from localities where geo_code = '62041'), 216200410, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune d’Auchel', (select array_agg(id) from localities where geo_code = '62048'), 216200485, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune du Monastier-sur-Gazeille', (select array_agg(id) from localities where geo_code = '43135'), 214301350, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Varennes-sur-Allier', (select array_agg(id) from localities where geo_code = '03298'), 210302980, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Montreuil-sur-Mer', (select array_agg(id) from localities where geo_code = '62588'), 216205880, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune d’Argelès-Gazost', (select array_agg(id) from localities where geo_code = '65025'), 216500256, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Cauterets', (select array_agg(id) from localities where geo_code = '65138'), 216501387, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune d’Aubigny-sur-Nère', (select array_agg(id) from localities where geo_code = '18015'), 211800156, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Vichy', (select array_agg(id) from localities where geo_code = '03310'), 210303103, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Cusset', (select array_agg(id) from localities where geo_code = '03095'), 210300950, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Luxeuil-les-Bains', (select array_agg(id) from localities where geo_code = '70311'), 217003110, true);
INSERT INTO public.establishments (name, localities_id, siren, available)
VALUES ('Commune de Lannemezan', (select array_agg(id) from localities where geo_code = '65258'), 216502583, true);

UPDATE public.establishments set localities_id = array_prepend((select id from localities where geo_code = '69381'), localities_id) where name = 'Métropole de Lyon';
UPDATE public.establishments set localities_id = array_prepend((select id from localities where geo_code = '69382'), localities_id) where name = 'Métropole de Lyon';
UPDATE public.establishments set localities_id = array_prepend((select id from localities where geo_code = '69383'), localities_id) where name = 'Métropole de Lyon';
UPDATE public.establishments set localities_id = array_prepend((select id from localities where geo_code = '69384'), localities_id) where name = 'Métropole de Lyon';
UPDATE public.establishments set localities_id = array_prepend((select id from localities where geo_code = '69385'), localities_id) where name = 'Métropole de Lyon';
UPDATE public.establishments set localities_id = array_prepend((select id from localities where geo_code = '69386'), localities_id) where name = 'Métropole de Lyon';
UPDATE public.establishments set localities_id = array_prepend((select id from localities where geo_code = '69387'), localities_id) where name = 'Métropole de Lyon';
UPDATE public.establishments set localities_id = array_prepend((select id from localities where geo_code = '69388'), localities_id) where name = 'Métropole de Lyon';
UPDATE public.establishments set localities_id = array_prepend((select id from localities where geo_code = '69389'), localities_id) where name = 'Métropole de Lyon';
UPDATE public.establishments set localities_id = array_remove(localities_id, (select id from localities where geo_code = '69123')) where name = 'Métropole de Lyon';

update establishments set available = true where siren in
('200066637',
 '200066660',
 '200067205',
 '200070464',
 '200071082',
 '243600327',
 '247200090',
 '200071934',
 '200073419',
 '200065928',
 '200066009',
 '200046977',
 '251503199',
 '245400676',
 '200040715',
 '246700488',
 '200067759',
 '243300316',
 '200093201',
 '200069037',
 '200066389',
 '247100589',
 '200035814',
 '248400053',
 '200069037',
 '200069052',
 '200023737',
 '241500230',
 '200067254',
 '200042190',
 '200070043',
 '200073419',
 '200065597',
 '200043081',
 '242500361',
 '200066876',
 '200065886',
 '247000011',
 '200067759',
 '200035731',
 '243400017',
 '241800374',
 '200023307',
 '241800507',
 '200070407',
 '130010366',
 '244300307',
 '200071082',
 '212000335',
 '200041630',
 '243500139',
 '244100798',
 '247200090',
 '212000046',
 '248400251',
 '200069425',
 '200070324',
 '130010366',
 '246500573',
 '200055481',
 '219733029',
 '216803346',
 '200027217',
 '240300491',
 '212202667',
 '216501296',
 '216200410',
 '200069409',
 '200072460',
 '216200485',
 '200000933',
 '200068781',
 '214301350',
 '200071512',
 '210302980',
 '243400819',
 '200084952',
 '246200299',
 '200067742',
 '200083392',
 '200041622',
 '200069961'
);

insert into campaigns(campaign_number, start_month, filters, validated_at, exported_at, sent_at, sending_date, establishment_id, reminder_number, created_by)
 select
    0,
    to_char(current_date, 'YYMM'),
    '{"query": "", "dataYears": [], "ownerAges": [], "localities": [], "ownerKinds": [], "campaignIds": [], "multiOwners": [], "roomsCounts": [], "housingAreas": [], "housingKinds": [], "vacancyRates": [], "housingCounts": [], "housingScopes": {"geom": true, "scopes": []}, "housingStates": [], "isTaxedValues": [], "localityKinds": [], "ownershipKinds": [], "buildingPeriods": [], "campaignsCounts": [], "vacancyDurations": [], "beneficiaryCounts": []}',
    current_date,
    current_date,
    current_date,
    current_date,
    id,
    0,
    (select id from users where establishment_id is null and upper(last_name) = 'RIVALS')
    from establishments e
    where not exists(select * from campaigns where establishment_id = e.id and campaign_number = 0);
