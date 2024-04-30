import { SingleBar, Presets } from 'cli-progress';
import { parse } from 'csv-parse';
import { Map } from 'immutable';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

import { logger } from '../../server/utils/logger';
import db from '../../server/repositories/db';

const progressBarBAN = new SingleBar({}, Presets.shades_classic);
const progressBarUpdate = new SingleBar({}, Presets.shades_classic);

const YEAR = '2023';
const BAN_FILE_LOCATION =
  '/Volumes/Zéro_Logement_Vacant/BAN/adresses-france-BAL.csv';
const result = execSync(`wc -l < "${BAN_FILE_LOCATION}"`, {
  encoding: 'utf-8',
});
const TOTAL_BAN_DATA_LINES = parseInt(result.trim(), 10);

let banData = Map<string, { long: number; lat: number }>();

const processRow = async (housing: any) => {
  return new Promise<void>((resolve) => {
    progressBarUpdate.increment();
    const doProcess = async () => {
      const ban_id: string = housing?.ban_id;
      if (ban_id) {
        const banItem = banData.get(ban_id);
        if (banItem?.long && banItem?.lat) {
          await db.raw(
            `update fast_housing set longitude='${banItem?.long}', latitude='${banItem?.lat}' where local_id='${housing.local_id}'`
          );
        }
      }
      resolve();
    };
    doProcess();
  });
};

function transform(transformFunction: {
  (row: any, callback: any): void;
  (arg0: any, arg1: any): void;
}) {
  let isFirstCol = true;
  return require('stream').Transform({
    objectMode: true,
    transform: function (
      row: any,
      encoding: any,
      callback: (arg0: null, arg1: any) => any
    ) {
      if (isFirstCol) {
        isFirstCol = false;
        return callback(null, row);
      }
      transformFunction(row, callback);
    },
  });
}

const main = async () => {
  logger.info('Importing locations...');

  logger.info('Load BAN data...');
  progressBarBAN.start(TOTAL_BAN_DATA_LINES, 0);
  fs.createReadStream(BAN_FILE_LOCATION)
    .pipe(parse({ columns: true, delimiter: ';' }))
    .pipe(
      transform(function (
        row: { [s: string]: unknown } | ArrayLike<unknown>,
        callback: (arg0: null, arg1: unknown[]) => void
      ) {
        // Ignorer le premier élément de chaque ligne
        const values = Object.values(row);
        callback(null, values.slice(1));
      })
    )
    .on('data', (data: string[]) => {
      progressBarBAN.increment();

      const uid_adresse: string = data[0];
      const long = data[12];
      const lat = data[13];

      banData = banData.set(uid_adresse, {
        long: parseFloat(long),
        lat: parseFloat(lat),
      });
    })
    .on('end', async () => {
      logger.info('Update data...');

      const count = await db.raw(
        `select count(*) from fast_housing where latitude is null`
      );

      progressBarUpdate.start(parseInt(count.rows[0].count), 0);

      const queryStream = db
        .raw(
          `SELECT local_id, ban_id, idpar
    FROM fast_housing fh
    JOIN df_housing_nat_${YEAR} df ON fh.local_id = df.idLocal
    WHERE fh.latitude IS NULL`
        )
        .stream();

      let processing = 0;
      queryStream.on('data', async (row) => {
        if (processing > 6) {
          queryStream.pause();
        }
        processing++;

        try {
          await processRow(row);
        } catch (e) {
          console.log('Erreur lors du traitement de la ligne:', e);
        }

        processing--;
        if (queryStream.isPaused()) {
          queryStream.resume();
        }
      });
    });
};

main();
