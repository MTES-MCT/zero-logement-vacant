
insert into buildings (id, housing_count, vacant_housing_count)
select building_id, count(building_id), count(building_id)
from housing
where building_id is not null
and not exists (select * from buildings where id = building_id)
group by building_id;


create table _buildings_21
(
    increment text,
    id text,
    housing_count text
);

--cmd psql /copy

update buildings b
set housing_count = _b.housing_count
from _buildings_21 _b
where b.id = _b.id;
