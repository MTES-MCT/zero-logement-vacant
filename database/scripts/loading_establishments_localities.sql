insert into establishments (name, reference) (
    select distinct(libepci), epci
    from _localities
);

insert into localities (geo_code, name, establishment_id) (
    select lpad(codgeo, 5, '0'), libgeo, id
    from _localities l, establishments e
    where l.epci = e.reference
);
