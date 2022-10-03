// @ts-ignore
exports.up = function(knex) {
    return Promise.all([
        knex.raw("update housing set sub_status = 'Intérêt potentiel' where sub_status = 'À recontacter'"),
        knex.raw("update housing set precisions = array_replace(precisions, 'Travaux trop importants', 'Montant travaux trop important') where precisions::text[] @> ARRAY['Travaux trop importants']"),
        knex.raw("update housing set vacancy_reasons = array_replace(vacancy_reasons, 'Liée au logement - travaux trop importants', 'Liée au logement - montant travaux trop important') where vacancy_reasons::text[] @> ARRAY['Liée au logement - travaux trop importants']")
    ]);
};

// @ts-ignore
exports.down = function(knex) {
  return Promise.all([
      knex.raw("update housing set sub_status = 'À recontacter' where sub_status = 'Intérêt potentiel'"),
      knex.raw("update housing set precisions = array_replace(precisions, 'Montant travaux trop important', 'Travaux trop importants') where precisions::text[] @> ARRAY['Montant travaux trop important']"),
      knex.raw("update housing set vacancy_reasons = array_replace(vacancy_reasons, 'Liée au logement - montant travaux trop important', 'Liée au logement - travaux trop importants') where vacancy_reasons::text[] @> ARRAY['Liée au logement - montant travaux trop important']")
  ]);
};
