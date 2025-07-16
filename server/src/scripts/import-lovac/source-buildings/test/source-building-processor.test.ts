import { vi, MockedObject } from 'vitest';
import { ReadableStream } from 'node:stream/web';

import { SourceBuilding } from '~/scripts/import-lovac/source-buildings/source-building';
import { genSourceBuilding } from '~/scripts/import-lovac/infra/fixtures';
import {
  createSourceBuildingProcessor,
  ProcessorOptions
} from '~/scripts/import-lovac/source-buildings/source-building-processor';

describe('Source building processor', () => {
  let buildingRepository: MockedObject<ProcessorOptions['buildingRepository']>;
  let reporter: MockedObject<ProcessorOptions['reporter']>;

  beforeEach(() => {
    buildingRepository = {
      save: vi.fn().mockImplementation(() => Promise.resolve())
    };
    reporter = {
      passed: vi.fn(),
      skipped: vi.fn(),
      failed: vi.fn(),
      report: vi.fn()
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
    const processor = createSourceBuildingProcessor({
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
