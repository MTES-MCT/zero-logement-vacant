import path from 'path';
import { logger } from '../../server/utils/logger';
import db from '../../server/repositories/db';
import { housingTable } from '../../server/repositories/housingRepository';
import downloader from './downloader';

const schema = (department: string) =>
  `bdnb_2022_10_d_open_data_dep${department}`;

const batPlotTable = (department: string) =>
  `${schema(department)}.rel_batiment_groupe_parcelle`;
const batEnergyTable = (department: string) =>
  `${schema(department)}.batiment_groupe_dpe_representatif_logement`;

const loadSchema = async (department: string): Promise<void> => {
  logger.info(`Loading BDNB file...`, {
    department,
  });

  const cmd = `psql $DATABASE_URL -f ${path.join(
    downloader.getArchiveDir(department),
    'bdnb.sql'
  )}`;
  const exec = require('child_process').exec;

  return new Promise((resolve) => {
    exec(cmd, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error(`error: ${error.message}`);
      }
      if (stderr) {
        console.warn(`stderr: ${stderr}`);
      }

      logger.info(`Loading done`);
      resolve(stdout ? stdout : stderr);
    });
  });
};

const dropSchema = async (department: string): Promise<void> => {
  logger.info(`Dropping BDNB schema...`, {
    department,
  });

  await db.schema.dropSchema(schema(department), true);
};

const updateHousingEnergyConsumption = async (department: string) => {
  await db.raw(`
    UPDATE ${housingTable}
    SET energy_consumption = ${batEnergyTable(department)}.classe_bilan_dpe
    FROM ${batPlotTable(department)}, ${batEnergyTable(department)}
    WHERE ${housingTable}.plot_id = ${batPlotTable(department)}.parcelle_id
    AND ${batPlotTable(department)}.batiment_groupe_id 
        = ${batEnergyTable(department)}.batiment_groupe_id
    AND occupancy_registered = 'L'
    AND plot_id is not null
    AND geo_code like '${department}%'
    AND ${batEnergyTable(department)}.arrete_2021`);
};

const loader = {
  loadSchema,
  dropSchema,
  updateHousingEnergyConsumption,
};

export default loader;
