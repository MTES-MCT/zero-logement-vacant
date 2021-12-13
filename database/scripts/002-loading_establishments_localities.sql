insert into localities (geo_code, name) (
    select lpad(codgeo, 5, '0'), libgeo from _localities
);

insert into establishments (epci_id, name, localities_id) (
    select distinct(epci), libepci, array_agg(l2.id)
    from _localities l1, localities l2
    where lpad(l1.codgeo, 5, '0') = l2.geo_code group by epci, libepci
);

INSERT INTO public.establishments (name, localities_id)
VALUES ('Commune de Brive-la-Gaillarde', (select array_agg(id) from localities where geo_code='19031'));
INSERT INTO public.establishments (name, localities_id, available)
VALUES ('Commune d''Ajaccio', (select array_agg(id) from localities where geo_code='2A004'), true);

update establishments set available = true where epci_id in
('200066637',
 '200066660',
 '200067205',
 '200070464',
 '200071082',
 '243600327',
 '247200090'
) or name = 'Commune de Brive-la-Gaillarde';
