// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.raw('CREATE EXTENSION IF NOT EXISTS "unaccent";')
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.raw('DROP EXTENSION IF EXISTS "unaccent";')
  ]);
};
