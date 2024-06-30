SELECT created_at, created_by, "public"."old_events"."housing_id",
          case when lower("public"."old_events"."content") like '%jamais contacté%' then 0
           when lower("public"."old_events"."content") like '%non suivi%' then 0
           when lower("public"."old_events"."content") like '%en attente de retour%' then 1
           when lower("public"."old_events"."content") like '%premier contact%' then 2
           when lower("public"."old_events"."content") like '%suivi en cours%' then 3
           when lower("public"."old_events"."content") like '%non-vacant%' then 4
           when lower("public"."old_events"."content") like '%suivi terminé%' then 4
           when lower("public"."old_events"."content") like '%bloqué%' then 5
           when lower("public"."old_events"."content") like '%sortie de la vacance%' then 4
           end as new_status, 
           case when (lower("public"."old_events"."content") like '%sortie de la vacance%') then '"Sortie de la vacance"' else null end as new_sub_status
               FROM  {{ source('duckdb_production_raw', 'old_events')}}

WHERE (lower("public"."old_events"."content") like '%passage à%')
           union
        SELECT created_at, created_by, he."housing_id",
          case when lower(coalesce((e.new -> 'status')::text, '')) like '%jamais contacté%' then 0
           when lower(coalesce((e.new -> 'status')::text, '')) like '%non suivi%' then 0
           when lower(coalesce((e.new -> 'status')::text, '')) like '%en attente de retour%' then 1
           when lower(coalesce((e.new -> 'status')::text, '')) like '%premier contact%' then 2
           when lower(coalesce((e.new -> 'status')::text, '')) like '%suivi en cours%' then 3
           when lower(coalesce((e.new -> 'status')::text, '')) like '%non-vacant%' then 4
           when lower(coalesce((e.new -> 'status')::text, '')) like '%suivi terminé%' then 4
           when lower(coalesce((e.new -> 'status')::text, '')) like '%bloqué%' then 5
           when lower(coalesce((e.new -> 'status')::text, '')) like '%sortie de la vacance%' then 4
           end as new_status, (e.new -> 'subStatus')::text as new_sub_status
               FROM {{ source('duckdb_production_raw', 'events')}} e, {{ source('duckdb_production_raw', 'housing_events')}} he
               where e.id = he.event_id
               and (e.name = 'Changement de statut de suivi' or e.name = 'Modification du statut')