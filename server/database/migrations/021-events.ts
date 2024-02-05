// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema// @ts-ignore
            .alterTable('events', (table) => {
                table.uuid('created_by').nullable().alter();
                table.text('content').alter();
            })
    ]);
};

// @ts-ignore
exports.down = function() {
    return Promise.all([]);
};
