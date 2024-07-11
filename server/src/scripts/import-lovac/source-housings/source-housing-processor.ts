import { WritableStream } from 'node:stream/web';
import { v4 as uuidv4 } from 'uuid';

import { ReporterOptions } from '~/scripts/import-lovac/infra';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import { HousingRecordDBO } from '~/repositories/housingRepository';
import { createLogger } from '~/infra/logger';

const logger = createLogger('sourceHousingProcessor');

interface ProcessorOptions extends ReporterOptions<SourceHousing> {
  saveHousing(housing: HousingRecordDBO): Promise<void>;
}

export function sourceHousingProcessor(opts: ProcessorOptions) {
  const { saveHousing, reporter } = opts;

  return new WritableStream<SourceHousing>({
    async write(chunk, controller) {
      try {
        logger.debug('Processing source housing...', { chunk });

        await saveHousing({
          id: uuidv4(),
          local_id: chunk.local_id,
          geo_code: chunk.geo_code,
          data_file_years: chunk.data_file_years,
          data_source: chunk.data_source,
          building_id: chunk.building_id,
          plot_id: chunk.plot_id,
          dgfip_address: chunk.dgfip_address,
          dgfip_latitude: chunk.dgfip_latitude,
          dgfip_longitude: chunk.dgfip_longitude,
          location_detail: chunk.location_detail,
          ban_address: chunk.ban_address,
          ban_score: chunk.ban_score,
          ban_latitude: chunk.ban_latitude,
          ban_longitude: chunk.ban_longitude,
          housing_kind: chunk.housing_kind,
          condominium: chunk.condominium,
          rooms_count: chunk.rooms_count,
          building_year: chunk.building_year,
          uncomfortable: chunk.uncomfortable,
          cadastral_classification: chunk.cadastral_classification,
          beneficiary_count: chunk.beneficiary_count,
          rental_value: chunk.rental_value,
          living_area: chunk.living_area,
          taxed: chunk.taxed,
          vacancy_start_year: chunk.vacancy_start_year,
          mutation_date: new Date(chunk.mutation_date),
          occupancy_source: chunk.occupancy_source,
          bdnb_building_group_id: chunk.bdnb_building_group_id,
          bdnb_energy_consumption: chunk.bdnb_energy_consumption,
          bdnb_energy_consumption_at: chunk.bdnb_energy_consumption_at,
          created_at: new Date(),
          updated_at: new Date()
        });
        reporter.passed(chunk);
      } catch (error) {
        controller.error(error);
      }
    }
  });
}
