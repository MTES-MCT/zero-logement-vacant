import { ReadableStream, WritableStream } from 'node:stream/web';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { genSourceOwner } from '~/scripts/import-lovac/infra/fixtures';
import {
  createOwnerEnricher,
  EnrichedOwner
} from '~/scripts/import-lovac/source-owners/source-owner-enricher';
import { genOwnerApi } from '~/test/testFixtures';

describe('createOwnerEnricher', () => {
  beforeEach(async () => {
    await Owners().delete();
  });

  it('should annotate a known owner with its existing DB record', async () => {
    const source = genSourceOwner();
    await Owners().insert(formatOwnerApi({ ...genOwnerApi(), idpersonne: source.idpersonne }));

    const result: EnrichedOwner[] = [];
    await new ReadableStream({
      pull(controller) {
        controller.enqueue(source);
        controller.close();
      }
    })
      .pipeThrough(createOwnerEnricher())
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(1);
    expect(result[0].source).toEqual(source);
    expect(result[0].existing?.idpersonne).toBe(source.idpersonne);
  });

  it('should annotate an unknown owner with null', async () => {
    const source = genSourceOwner();

    const result: EnrichedOwner[] = [];
    await new ReadableStream({
      pull(controller) {
        controller.enqueue(source);
        controller.close();
      }
    })
      .pipeThrough(createOwnerEnricher())
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(1);
    expect(result[0].existing).toBeNull();
  });

  it('should resolve multiple owners in a single bulk fetch', async () => {
    const sources = Array.from({ length: 5 }, () => genSourceOwner());
    await Owners().insert(
      sources
        .slice(0, 2)
        .map((s) => formatOwnerApi({ ...genOwnerApi(), idpersonne: s.idpersonne }))
    );

    const result: EnrichedOwner[] = [];
    await new ReadableStream({
      pull(controller) {
        for (const s of sources) controller.enqueue(s);
        controller.close();
      }
    })
      .pipeThrough(createOwnerEnricher())
      .pipeTo(new WritableStream({ write(item) { result.push(item); } }));

    expect(result).toHaveLength(5);
    expect(result.filter((r) => r.existing !== null)).toHaveLength(2);
    expect(result.filter((r) => r.existing === null)).toHaveLength(3);
  });
});
