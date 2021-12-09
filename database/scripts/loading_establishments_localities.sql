insert into establishments (id, name) (
    select distinct(epci), libepci
    from _localities where not exists(select e.id from establishments e where epci = e.id)
);


insert into localities (geo_code, name, establishment_id) (
    select lpad(codgeo, 5, '0'), libgeo, epci from _localities
);

INSERT INTO public.establishments (id, name, housing_scopes)
VALUES (19031, 'Commune de Brive-la-Gaillarde', null);

