insert into localities (geo_code, name) (
    select lpad(codgeo, 5, '0'), libgeo from _localities
);

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
VALUES ('Commune de Mulhouse', (select array_agg(id) from localities where geo_code='68224'), true);
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Département du Cher', (select array_agg(id) from localities where geo_code like '18%'), true);

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
 '251503199'
);
