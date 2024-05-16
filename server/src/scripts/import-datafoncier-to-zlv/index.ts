import { logger } from '~/infra/logger';
import { toHousingRecordApi, toOwnerApi } from '../shared';
import db from '~/infra/database/';

import { SingleBar, Presets } from 'cli-progress';
import ownerMatchRepository from '~/repositories/ownerMatchRepository';
import ownerRepository from '~/repositories/ownerRepository';
import { HousingOwners } from '~/repositories/housingOwnerRepository';
import housingRepository from '~/repositories/housingRepository';

const progressBar = new SingleBar({}, Presets.shades_classic);

const YEAR = '2023';

const processRow = async (dfHousing: any) => {
  progressBar.increment();
  const doProcess = async () => {
    const housing = toHousingRecordApi(
      { source: 'datafoncier-import' },
      dfHousing,
    );

    const dfOwner = await db.raw(
      `SELECT * FROM df_owners_nat_${YEAR} WHERE idlocal='${housing.localId}'`,
    );

    if (dfOwner.rows.length === 0) {
      return;
    }

    const ownerMatch = await ownerMatchRepository.findOne({
      idpersonne: dfOwner.rows[0].idpersonne,
    });

    let owner;
    if (ownerMatch) {
      owner = await ownerRepository.get(ownerMatch.owner_id);
    } else {
      owner = toOwnerApi(dfOwner.rows[0]);
      try {
        await ownerRepository.save(owner);
      } catch (e) {
        return;
      }
    }

    if (owner === null) {
      return;
    } else {
      try {
        await housingRepository.save(housing);
        await HousingOwners().insert({
          owner_id: owner.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode,
          rank: 1,
        });
      } catch (e: any) {
        return;
      }
    }
  };
  return doProcess();
};

const main = async () => {
  logger.info('Importing datafoncier raw data to ZLV tables...');

  const count = await db.raw(`SELECT count(df.*)
  FROM df_housing_nat_${YEAR} df
  WHERE NOT EXISTS (
      SELECT 1
      FROM fast_housing fh
      WHERE df.idlocal = fh.local_id
  )`);

  progressBar.start(parseInt(count.rows[0].count), 0);

  const queryStream = db
    .raw(
      `
    SELECT df.*
    FROM df_housing_nat_${YEAR} df
    WHERE NOT EXISTS (
        SELECT 1
        FROM fast_housing fh
        WHERE df.idlocal = fh.local_id
    )
  `,
    )
    .stream();

  queryStream.on('data', async (row) => {
    queryStream.pause();
    try {
      await processRow(row);
    } catch (e) {
      console.log('Erreur lors du traitement de la ligne:', e);
    }
    queryStream.resume();
  });
};

main();
