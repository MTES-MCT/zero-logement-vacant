// @ts-ignore
exports.seed = function(knex) {
    return Promise.all([
        knex.table('campaigns').insert({
            id: 'db16f3c7-d284-4601-966e-b08534d74c1e',
            campaign_number: 1,
            start_month: '2111',
            reminder_number: 0,
            filters: '{"query": "", "ownerAges": ["lt40"], "ownerKinds": [], "excludedIds": [], "multiOwners": [], "housingAreas": [], "housingKinds": [], "housingStates": [], "isTaxedValues": [], "contactsCounts": [], "buildingPeriods": [], "vacancyDurations": [], "beneficiaryCounts": []}',
            establishment_id: 'fb42415a-a41a-4b22-bf47-7bedfb419a63',
            created_by: '8da707d6-ff58-4366-a2b3-59472c600dca'
        }).then(() =>
            knex.table('campaigns_housing').insert({
                campaign_id: 'db16f3c7-d284-4601-966e-b08534d74c1e',
                housing_id: 'c0ec7153-0e1c-4770-bc98-ad6ce1779f9a'
            })
        )
    ])
};
