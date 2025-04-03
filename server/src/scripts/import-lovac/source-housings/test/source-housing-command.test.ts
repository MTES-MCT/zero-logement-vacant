import { Occupancy } from '@zerologementvacant/models';
import { stringify } from 'csv-stringify';
import fp from 'lodash/fp';
import fs from 'node:fs';
import path from 'node:path';
import { Transform, Writable } from 'node:stream';
import { ReadableStream, TransformStream } from 'node:stream/web';
import config from '~/infra/config';
import { BuildingApi } from '~/models/BuildingApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { UserApi } from '~/models/UserApi';
import {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO
} from '~/repositories/housingRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { genSourceHousing } from '~/scripts/import-lovac/infra/fixtures';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';

import { createSourceHousingCommand } from '~/scripts/import-lovac/source-housings/source-housing-command';
import {
  genBuildingApi,
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('Source housing command', () => {
  const command = createSourceHousingCommand();
  const file = path.join(__dirname, 'housings.csv');

  const building: BuildingApi = genBuildingApi();
  const missingSourceHousings: SourceHousing[] = Array.from(
    { length: 3 },
    () => ({ ...genSourceHousing(), building_id: building.id })
  );
  const nonVacantUnsupervisedHousings = [
    { ...genSourceHousing(), building_id: building.id }
  ];
  const vacantHousings = Array.from({ length: 3 }, () => ({
    ...genSourceHousing(),
    building_id: building.id
  }));

  const sourceHousings: ReadonlyArray<SourceHousing> = [
    ...missingSourceHousings,
    ...nonVacantUnsupervisedHousings,
    ...vacantHousings
  ];

  beforeAll(async () => {
    const establishment = genEstablishmentApi();
    await Establishments().insert(formatEstablishmentApi(establishment));
    const auth: UserApi = {
      ...genUserApi(establishment.id),
      email: config.app.system
    };
    await Users().insert(formatUserApi(auth));
    await Buildings().insert(formatBuildingApi(building));
    const housings: ReadonlyArray<HousingApi> = [
      ...nonVacantUnsupervisedHousings.map<HousingApi>((sourceHousing) => ({
        ...genHousingApi(),
        buildingId: building.id,
        geoCode: sourceHousing.geo_code,
        localId: sourceHousing.local_id,
        occupancy: Occupancy.RENT
      })),
      ...vacantHousings.map<HousingApi>((sourceHousing) => ({
        ...genHousingApi(),
        buildingId: building.id,
        geoCode: sourceHousing.geo_code,
        localId: sourceHousing.local_id,
        occupancy: Occupancy.VACANT,
        dataFileYears: ['lovac-2022']
      }))
    ];
    await Housing().insert(housings.map(formatHousingRecordApi));
    await write(file, sourceHousings);

    await command(file, { abortEarly: true });
  });

  it('should import new housings', async () => {
    const actual = await Housing().whereIn(
      ['geo_code', 'local_id'],
      missingSourceHousings.map((sourceHousing) => [
        sourceHousing.geo_code,
        sourceHousing.local_id
      ])
    );
    expect(actual).toHaveLength(missingSourceHousings.length);
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      return housing.occupancy === Occupancy.VACANT;
    });
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      return housing.status === HousingStatusApi.NeverContacted;
    });
  });

  it('should import existing non-vacant unsupervised housings', async () => {
    const actual = await Housing().whereIn(
      ['geo_code', 'local_id'],
      nonVacantUnsupervisedHousings.map((sourceHousing) => [
        sourceHousing.geo_code,
        sourceHousing.local_id
      ])
    );
    expect(actual).toHaveLength(nonVacantUnsupervisedHousings.length);
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      return housing.data_file_years?.includes('lovac-2024') ?? false;
    });
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      return housing.occupancy === Occupancy.VACANT;
    });
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      return housing.status === HousingStatusApi.NeverContacted;
    });
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      return housing.sub_status === null;
    });
  });

  it('should import existing vacant housings', async () => {
    const actual = await Housing().whereIn(
      ['geo_code', 'local_id'],
      vacantHousings.map((sourceHousing) => [
        sourceHousing.geo_code,
        sourceHousing.local_id
      ])
    );
    expect(actual).toHaveLength(vacantHousings.length);
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      return (housing.data_file_years?.length ?? 0) >= 2;
    });
    expect(actual).toSatisfyAll<HousingRecordDBO>((housing) => {
      return housing.data_file_years?.includes('lovac-2024') ?? false;
    });
  });
});

async function write(
  file: string,
  sourceHousings: ReadonlyArray<SourceHousing>
): Promise<void> {
  await new ReadableStream<SourceHousing>({
    pull(controller) {
      sourceHousings.forEach((sourceHousing) => {
        controller.enqueue(sourceHousing);
      });
      controller.close();
    }
  })
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(fp.mapValues(mapper, chunk));
        }
      })
    )
    .pipeThrough<string>(
      Transform.toWeb(
        stringify({
          header: true
        })
      )
    )
    .pipeTo(Writable.toWeb(fs.createWriteStream(file)));
}

function mapper(value: unknown): any {
  if (fp.isNull(value)) {
    return '';
  }
  if (fp.isBoolean(value)) {
    return value ? 'true' : 'false';
  }
  if (fp.isDate(value)) {
    return value.toJSON();
  }

  return value;
}
