// @ts-ignore
exports.seed = function(knex) {
    return knex.table('campaigns').insert({
        campaign_number: 1,
        start_month: '2111',
        kind: '0',
        filters: '{"query": "", "ownerAges": ["lt40"], "ownerKinds": [], "excludedIds": [], "multiOwners": [], "housingAreas": [], "housingKinds": [], "housingStates": [], "isTaxedValues": [], "contactsCounts": [], "buildingPeriods": [], "vacancyDurations": [], "beneficiaryCounts": []}',
        establishment_id: 1,
        created_by: '8da707d6-ff58-4366-a2b3-59472c600dca'
    })
};
