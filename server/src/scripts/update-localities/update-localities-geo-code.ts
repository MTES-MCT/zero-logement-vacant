import db from '~/infra/database';

async function updateLocalitiesGeoCodes() {
  console.log('Starting the update of localities_geo_code...');

  await db.raw(`
    UPDATE establishments e
    SET localities_geo_code = sub.geo_codes
    FROM (
      SELECT 
        e.id AS establishment_id,
        ARRAY_AGG(DISTINCT l.geo_code) AS geo_codes
      FROM establishments_localities el
      JOIN localities l ON l.id = el.locality_id
      JOIN establishments e ON e.id = el.establishment_id
      WHERE e.kind IN ('Commune', 'CA', 'CC')
      GROUP BY e.id
    ) sub
    WHERE e.id = sub.establishment_id
  `);

  console.log('Update completed.');
}

updateLocalitiesGeoCodes().catch((err) => {
  console.error('Error during the update:', err);
  process.exit(1);
});
