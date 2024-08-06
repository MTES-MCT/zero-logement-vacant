import { ReadableStream } from 'node:stream/web';

import { SourceBuilding } from '~/scripts/import-lovac/source-buildings/source-building';
import { genSourceBuilding } from '~/scripts/import-lovac/infra/fixtures';
import {
  ProcessorOptions,
  sourceBuildingProcessor
} from '~/scripts/import-lovac/source-buildings/source-building-processor';

describe('Source building processor', () => {
  let buildingRepository: jest.MockedObject<
    ProcessorOptions['buildingRepository']
  >;
  let reporter: jest.MockedObject<ProcessorOptions['reporter']>;

  beforeEach(() => {
    buildingRepository = {
      save: jest.fn().mockImplementation(() => Promise.resolve())
    };
    reporter = {
      passed: jest.fn(),
      skipped: jest.fn(),
      failed: jest.fn(),
      report: jest.fn()
    };
  });

  it('should save the buildings', async () => {
    const sourceBuildings = Array.from({ length: 3 }, genSourceBuilding);
    const stream = new ReadableStream<SourceBuilding>({
      pull(controller) {
        sourceBuildings.forEach((sourceBuilding) => {
          controller.enqueue(sourceBuilding);
        });
        controller.close();
      }
    });
    const processor = sourceBuildingProcessor({
      abortEarly: true,
      buildingRepository,
      reporter
    });

    await stream.pipeTo(processor);

    expect(buildingRepository.save).toHaveBeenCalledTimes(
      sourceBuildings.length
    );
  });
});
