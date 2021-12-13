// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.schema // @ts-ignore
            .table('housing', function (table) {
                table.index(['invariant'], 'housing_invariant_idx');
            }),
        knex.schema // @ts-ignore
            .table('housing', function (table) {
                table.index(['insee_code'], 'housing_insee_code_idx');
            }),
        knex.schema // @ts-ignore
            .table('owners', function (table) {
                table.index(['invariants'], 'owner_invariants_idx');
            })
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.schema // @ts-ignore
          .table('housing', function (table) {
              table.dropIndex(['invariant'], 'housing_invariant_idx');
          }),
      knex.schema // @ts-ignore
          .table('housing', function (table) {
              table.dropIndex(['insee_code'], 'housing_insee_code_idx');
          }),
      knex.schema // @ts-ignore
          .table('owners', function (table) {
              table.dropIndex(['invariants'], 'owner_invariants_idx');
          })
  ]);
};
