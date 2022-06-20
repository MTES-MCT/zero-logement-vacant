// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.raw("update housing set ownership_kind = null where ownership_kind='0'")
    ]);
};

// @ts-ignore
exports.down = function() {
  return Promise.all([]);
};
