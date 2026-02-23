-- Test: Vérifier que les types d'événements sont valides
-- Liste exhaustive des types d'événements autorisés dans l'application ZLV

SELECT 
    id, 
    type, 
    'Type événement invalide' as issue
FROM {{ ref('int_production_events') }}
WHERE type NOT IN (
    -- Événements de statut/occupation
    'housing:status-updated', 
    'housing:occupancy-updated',
    -- Événements de mise à jour
    'housing:updated',
    -- Événements de groupe
    'housing:group-attached', 
    'housing:group-removed', 
    'housing:group-detached',
    'housing:group-archived',
    -- Événements de campagne
    'housing:campaign-attached', 
    'housing:campaign-removed', 
    'housing:campaign-detached',
    -- Événements de propriétaire
    'housing:owner-updated', 
    'housing:owner-attached', 
    'housing:owner-detached',
    -- Événements de création
    'housing:created',
    -- Événements de précision
    'housing:precision-attached', 
    'housing:precision-detached',
    -- Événements de périmètre
    'housing:perimeter-attached',
    'housing:perimeter-detached',
    -- Événements de document (housing)
    'housing:document-attached',
    'housing:document-detached',
    'housing:document-removed',
    -- Événements document directs
    'document:created',
    'document:updated',
    'document:removed',
    -- Événements owner directs
    'owner:updated', 
    'owner:created',
    -- Événements campagne directs
    'campaign:updated'
) 
AND type IS NOT NULL
