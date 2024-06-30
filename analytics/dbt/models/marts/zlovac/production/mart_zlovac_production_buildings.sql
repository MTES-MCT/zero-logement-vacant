-- Missing columns  vacancy_reasons, data_years, status, sub_status, precisions, energy_consumption, energy_consumption_worst, occupancy_registered, occupancy, occupancy_intended, plot_id
SELECT
   building_id,
   NULL AS id,
   NULL as increment,
   SUM(
        CASE
            WHEN building_id <> local_id AND ff_ccthp = 'V' THEN 1
            ELSE 0
        END
   ) as "housing_vacant_count",
   SUM(
        CASE
            WHEN building_id <> local_id AND ff_ccthp = 'L' THEN 1
            ELSE 0
        END
   ) as "housing_rent_count"
FROM {{ ref('int_zlovac') }}
  GROUP BY building_id


 
