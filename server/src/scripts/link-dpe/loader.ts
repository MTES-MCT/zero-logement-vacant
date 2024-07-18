import path from 'path';
import { logger } from '~/infra/logger';
import db from '~/infra/database/';
import { housingTable } from '~/repositories/housingRepository';
import downloader from './downloader';

//TODO
const schema = (department: string) =>
  `bdnb_2023_01_a_open_data_dep${department}`;

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
    exec(cmd, async (error: any, stdout: any, stderr: any) => {
      if (error) {
        logger.error(`error: ${error.message}`);
      }
      if (stderr) {
        logger.warn(`stderr: ${stderr}`);
      }

      logger.info(`Loading done`);

      logger.info(`Creating indexes...`);
      await db.raw(
        `CREATE INDEX idx_batenergy_batiment_groupe_id ON ${schema(department)}.batiment_groupe_dpe_representatif_logement(batiment_groupe_id);`
      );
      await db.raw(
        `CREATE INDEX idx_batenergy_arrete_2021 ON ${schema(department)}.batiment_groupe_dpe_representatif_logement(arrete_2021);`
      );
      logger.info(`Indexes created`);

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
    SET energy_consumption = ${batEnergyTable(department)}.classe_bilan_dpe,
        energy_consumption_at = ${batEnergyTable(
          department
        )}.date_etablissement_dpe,
        building_group_id = ${batEnergyTable(department)}.batiment_groupe_id
    FROM ${batPlotTable(department)}, ${batEnergyTable(department)}
    WHERE ${housingTable}.plot_id = ${batPlotTable(department)}.parcelle_id
    AND ${batPlotTable(department)}.batiment_groupe_id
        = ${batEnergyTable(department)}.batiment_groupe_id
    AND plot_id is not null
    AND geo_code like '${department}%'
--     AND ${batEnergyTable(department)}.classe_bilan_dpe is not null
    AND ${batEnergyTable(department)}.arrete_2021`);
};

const loader = {
  loadSchema,
  dropSchema,
  updateHousingEnergyConsumption,
};

export default loader;
