import { ReadableStream, WritableStream } from 'node:stream/web';
import { z } from 'zod';

import validator from '~/scripts/import-lovac/infra/validator';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';

describe('Validator', () => {
  const schema = z.object({
    name: z.string().min(1)
  });
  type Schema = z.infer<typeof schema>;

  const createStream = () =>
    new ReadableStream<Schema>({
      pull(controller) {
        controller.enqueue({ name: 'Bob' });
        controller.enqueue({ name: '' });
        controller.enqueue({ name: 'Alice' });
        controller.close();
      }
    });
  const createCountStream = (store: { owners: number }) =>
    new WritableStream<Schema>({
      write() {
        store.owners++;
      }
    });

  it('should throw the first encountered error if abort early is true', async () => {
    const store = { owners: 0 };

    const actual = async () =>
      await createStream()
        .pipeThrough(
          validator(schema, {
            abortEarly: true,
            reporter: createNoopReporter()
          })
        )
        .pipeTo(createCountStream(store));

    await expect(actual()).rejects.toThrow();
    expect(store.owners).toBe(1);
  });

  it('should go ahead otherwise', async () => {
    const store = { owners: 0 };

    await createStream()
      .pipeThrough(
        validator(schema, {
          reporter: createNoopReporter()
        })
      )
      .pipeTo(createCountStream(store));

    expect(store.owners).toBe(2);
  });
});
