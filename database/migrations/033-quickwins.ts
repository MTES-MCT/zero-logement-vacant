// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.raw("update housing set sub_status = 'Intérêt potentiel' where sub_status = 'À recontacter'")
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.raw("update housing set sub_status = 'À recontacter' where sub_status = 'Intérêt potentiel'")
  ]);
};
