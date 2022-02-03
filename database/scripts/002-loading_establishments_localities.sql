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

insert into establishments (epci_id, name, localities_id) (
    select distinct(epci), libepci, array_agg(l2.id)
    from _localities l1, localities l2
    where lpad(l1.codgeo, 5, '0') = l2.geo_code group by epci, libepci
);

INSERT INTO public.establishments (name, localities_id, available)
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Commune d''Ajaccio', (select array_agg(id) from localities where geo_code='2A004'), true);
INSERT INTO establishments(epci_id, name, localities_id, available)
VALUES ('251503199', 'SIVU "Auze-Ouest-Cantal"', (select array_agg(id) from localities where geo_code in ('15088', '15182', '15204')), true);
VALUES ('Commune de Brive-la-Gaillarde', (select array_agg(id) from localities where geo_code='19031'), true);
INSERT INTO public.establishments (name, localities_id, available)
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Département du Cher', (select array_agg(id) from localities where geo_code like '18%'), true);
VALUES ('Commune de Mulhouse', (select array_agg(id) from localities where geo_code='68224'), true);
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Commune de Vire Normandie', (select array_agg(id) from localities where geo_code='14762'), true);
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Commune de Roubaix', (select array_agg(id) from localities where geo_code='59512'), true);
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Département de la Meuse', (select array_agg(id) from localities where geo_code like '55%'), true);

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

update establishments set available = true where epci_id in
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
 '200069037'
);
