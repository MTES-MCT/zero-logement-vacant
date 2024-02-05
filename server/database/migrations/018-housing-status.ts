// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('housing', table => {
                table.integer('status');
                table.string('sub_status');
                table.string('precision');
            }),
        knex.raw('update housing h\n' +
            'set status = sub.status + 1, sub_status = sub.step, precision = sub.precision\n' +
            'from (\n' +
            '    select distinct on (ch.housing_id) housing_id, status, step, precision\n' +
            '    from campaigns_housing ch, campaigns c\n' +
            '    where c.id = ch.campaign_id\n' +
            '    order by ch.housing_id, c.campaign_number desc, reminder_number desc\n' +
            ') sub\n' +
            ' where h.id = sub.housing_id'),
        knex.schema// @ts-ignore
            .alterTable('campaigns_housing', (table) => {
                table.renameColumn('status', 'status_deprecated');
                table.renameColumn('step', 'step_deprecated');
                table.renameColumn('precision', 'precision_deprecated');
            }),
        knex.raw('insert into campaigns(campaign_number, start_month, filters, validated_at, exported_at, sent_at, sending_date, establishment_id, reminder_number, created_by)\n' +
            'select\n' +
            '         0,\n' +
            '         \'2203\',\n' +
            '         \'{"query": "", "dataYears": [], "ownerAges": [], "localities": [], "ownerKinds": [], "campaignIds": [], "multiOwners": [], "roomsCounts": [], "housingAreas": [], "housingKinds": [], "vacancyRates": [], "housingCounts": [], "housingScopes": {"geom": true, "scopes": []}, "housingStates": [], "isTaxedValues": [], "localityKinds": [], "ownershipKinds": [], "buildingPeriods": [], "campaignsCounts": [], "vacancyDurations": [], "beneficiaryCounts": []}\',\n' +
            '         current_date,\n' +
            '         current_date,\n' +
            '         current_date,\n' +
            '         current_date,\n' +
            '         id,\n' +
            '         0,\n' +
            '        (select id from users where establishment_id is null and upper(last_name) = \'RIVALS\')\n' +
            ' from establishments e\n' +
            ' where not exists(select * from campaigns where establishment_id = e.id and campaign_number = 0)')
    ]);
};

// @ts-ignore
exports.down = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('housing', table => {
                table.dropColumns(['status', 'sub_status', 'precision'])
            }),
        knex.schema// @ts-ignore
            .alterTable('campaigns_housing', (table) => {
                table.renameColumn('status_deprecated', 'status');
                table.renameColumn('step_deprecated', 'step');
                table.renameColumn('precision_deprecated', 'precision');
            })
    ]);
};
