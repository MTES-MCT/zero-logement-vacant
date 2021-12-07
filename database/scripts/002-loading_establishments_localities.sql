insert into establishments (id, name) (
    select distinct(epci), libepci
    from _localities
);

insert into localities (geo_code, name, establishment_id) (
    select lpad(codgeo, 5, '0'), libgeo, epci from _localities
);
