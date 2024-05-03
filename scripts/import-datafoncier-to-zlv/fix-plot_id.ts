import { logger } from '../../server/utils/logger';
import db from '../../server/repositories/db';
import { SingleBar, Presets } from 'cli-progress';

const progressBar = new SingleBar({}, Presets.shades_classic);

const processRow = async (housing: any) => {
  return new Promise<void>((resolve) => {
    progressBar.increment();
    const doProcess = async () => {
      await db.raw(`UPDATE fast_housing SET plot_id='${housing.idpar}' WHERE local_id='${housing.local_id}'`);
      resolve();
    };
    doProcess();
    });
};

const main = async () => {

  logger.info('Importing datafoncier raw data to ZLV tables (missing plot_id)...');

  const count = await db.raw(`select count(*) from fast_housing where source = 'datafoncier-import' and plot_id IS NULL`);
  progressBar.start(parseInt(count.rows[0].count), 0);

  const queryStream = db.raw(`SELECT local_id, idpar
  FROM fast_housing fh
  JOIN df_housing_nat_2023 df ON fh.local_id = df.idLocal
  WHERE source = 'datafoncier-import' and plot_id IS NULL`).stream();

  let processing = 0;
  queryStream.on('data', async (row) => {

    if(processing > 6) {
      queryStream.pause();
    }
    processing++;

    try {
      await processRow(row);
    } catch (e) {
      console.log('Erreur lors du traitement de la ligne:', e);
    }

    processing--;
    if(queryStream.isPaused()) {
      queryStream.resume();
    }
  });
};

main();

