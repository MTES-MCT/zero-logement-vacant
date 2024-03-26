import { logger } from '../../server/utils/logger';
import { toHousingRecordApi, toOwnerApi } from '../shared';
import db from '../../server/repositories/db';

import { SingleBar, Presets } from 'cli-progress';
import ownerMatchRepository from '../../server/repositories/ownerMatchRepository';
import ownerRepository from '../../server/repositories/ownerRepository';
import { HousingOwners } from '../../server/repositories/housingOwnerRepository';
import housingRepository from '../../server/repositories/housingRepository';

const progressBar = new SingleBar({}, Presets.shades_classic);

const processRow = async (dfHousing: any) => {
  return new Promise<void>((resolve, reject) => {
    progressBar.increment();
    const doProcess = async () => {
      const housing = toHousingRecordApi({ source: 'datafoncier-import' }, dfHousing);

      // TODO: years in parameters
      const dfOwner = await db.raw(`SELECT * FROM df_owners_nat_2023 WHERE idlocal='${housing.localId}'`);

      if(dfOwner.rows.length == 0) {
        reject();
        return;
      }

      const ownerMatch = await ownerMatchRepository.findOne({
        idpersonne: dfOwner.rows[0].idpersonne,
      });

      let owner;
      if(ownerMatch) {
        owner = await ownerRepository.get(ownerMatch.owner_id);
      } else {
        owner = toOwnerApi(dfOwner.rows[0]);
        try {
          await ownerRepository.save(owner);
        } catch(e) {
          reject();
          return;
        }
      }

      if(owner == null) {
        reject();
        return;
      } else {
        try {
          await housingRepository.save(
            housing
          );
          await HousingOwners().insert({
            owner_id: owner.id,
            housing_id: housing.id,
            housing_geo_code: housing.geoCode,
            rank: 1,
          });
        } catch(e: any) {
          reject();
        }
      }
      resolve();
    }
    doProcess();
    })
}

const main = async () => {

  logger.info('Importing datafoncier raw data to ZLV tables...');

  // TODO: years in parameters
  const count = await db.raw(`SELECT count(df.*)
  FROM df_housing_nat_2023 df
  WHERE idcom = ANY(ARRAY['35238','35240','35245','35250','35266','35275','35278','35281','35001','35022','35024','35032','35039','35047','35051','35055','35058','35059','35065','35066','35076','35079','35080','35081','35088','35120','35131','35139','35144','35180','35189','35196','35204','35206','35208','35210','35216','35315','35334','35351','35352','35353','35363'])
  AND NOT EXISTS (
      SELECT 1
      FROM fast_housing fh
      WHERE df.idlocal = fh.local_id
  )`);

  progressBar.start(parseInt(count.rows[0].count), 0);

  // TODO: years in parameters
  db.raw(`SELECT df.*
  FROM df_housing_nat_2023 df
  WHERE idcom = ANY(ARRAY['35238','35240','35245','35250','35266','35275','35278','35281','35001','35022','35024','35032','35039','35047','35051','35055','35058','35059','35065','35066','35076','35079','35080','35081','35088','35120','35131','35139','35144','35180','35189','35196','35204','35206','35208','35210','35216','35315','35334','35351','35352','35353','35363'])
  AND NOT EXISTS (
      SELECT 1
      FROM fast_housing fh
      WHERE df.idlocal = fh.local_id
  )`).then(async (result) => {
    const rows = result.rows;

    for (let i = 0; i < rows.length; i++) {
      try {
        await processRow(rows[i]);
      } catch(e) {
        console.log("error:" + rows[i]);
      }

    }
  })
}

main();

