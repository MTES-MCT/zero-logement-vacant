CREATE TEMPORARY VIEW local_ids AS (
    SELECT local_id, COUNT(local_id) FROM housing
    GROUP BY local_id
    HAVING COUNT(local_id) >= 2
);

CREATE TEMPORARY VIEW housing_duplicates AS (
    SELECT local_id, housing.id, o.id as owner_id, vacancy_start_year, data_years, origin, rooms_count, mutation_date, taxed, rental_value, oh.rank, o.full_name, o.raw_address FROM housing
    JOIN owners_housing oh ON oh.housing_id = housing.id
    JOIN owners o ON o.id = oh.owner_id
    WHERE local_id IN (SELECT local_id FROM local_ids)
    ORDER BY local_id, housing_id, rank
);

UPDATE housing
SET local_id = CONCAT(local_id, ':', id)
WHERE id IN (SELECT hd.id FROM housing_duplicates hd);

CREATE TEMPORARY VIEW owner_duplicates AS (
    WITH owns AS (
        SELECT full_name, raw_address, birth_date, COUNT(*) FROM owners
        GROUP BY full_name, raw_address, birth_date
        HAVING COUNT(*) > 1
    )
    SELECT o.* FROM owners o
    JOIN owns ON o.full_name = owns.full_name AND o.raw_address = owns.raw_address
    LEFT JOIN owners_housing oh ON oh.owner_id = o.id
    GROUP BY o.id
    ORDER BY o.full_name
);

UPDATE owners
SET full_name = CONCAT(full_name, ':', id)
WHERE id IN (SELECT od.id FROM owner_duplicates od);
