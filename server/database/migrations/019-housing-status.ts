// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('housing', (table) => {
                table.renameColumn('precision', 'precisions');
            }),
        knex.raw(`alter table housing alter precisions type varchar(255)[] using array[precisions];`)
    ]);
};

// @ts-ignore
exports.down = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('housing', (table) => {
                table.renameColumn('precisions', 'precision');
            }),
        knex.raw(`alter table housing alter precision type varchar(255) using coalesce(precision[1], '');`)
    ]);
};
