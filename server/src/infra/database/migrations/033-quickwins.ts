import { Knex } from 'knex';

const campaignsTable = 'campaigns';
const campaignsHousingTable = 'campaigns_housing';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.raw(
      "update housing set sub_status = 'Intérêt potentiel' where sub_status = 'À recontacter'"
    ),
    knex.raw(
      "update housing set precisions = array_replace(precisions, 'Travaux trop importants', 'Montant travaux trop important') where precisions::text[] @> ARRAY['Travaux trop importants']"
    ),
    knex.raw(
      "update housing set vacancy_reasons = array_replace(vacancy_reasons, 'Liée au logement - travaux trop importants', 'Liée au logement - montant travaux trop important') where vacancy_reasons::text[] @> ARRAY['Liée au logement - travaux trop importants']"
    ),
    knex.raw(
      "update housing set sub_status = 'Vacance volontaire' where sub_status = 'Vacance volontaire '"
    ),
    knex.raw(
      "update housing set sub_status = 'Vacance volontaire' where sub_status = 'Vacance organisée'"
    ),
    knex
      .table(`${campaignsHousingTable} as ch1`)
      .delete()
      .whereExists(
        knex
          .table(`${campaignsHousingTable} as ch2`)
          .join(`${campaignsTable} as c1`, 'ch1.campaign_id', 'c1.id')
          .join(`${campaignsTable} as c2`, 'ch2.campaign_id', 'c2.id')
          .where('c1.campaign_number', 0)
          .andWhereNot('c2.campaign_number', 0)
          .andWhereRaw('ch1.housing_id = ch2.housing_id')
      )
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.raw(
      "update housing set sub_status = 'À recontacter' where sub_status = 'Intérêt potentiel'"
    ),
    knex.raw(
      "update housing set precisions = array_replace(precisions, 'Montant travaux trop important', 'Travaux trop importants') where precisions::text[] @> ARRAY['Montant travaux trop important']"
    ),
    knex.raw(
      "update housing set vacancy_reasons = array_replace(vacancy_reasons, 'Liée au logement - montant travaux trop important', 'Liée au logement - travaux trop importants') where vacancy_reasons::text[] @> ARRAY['Liée au logement - montant travaux trop important']"
    )
  ]);
}
