import { ReadableStream, WritableStream } from 'node:stream/web';
import { InferType, object, string, ValidationError } from 'yup';

import validator from '~/scripts/import-lovac/infra/validator';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';

describe('Validator', () => {
  const schema = object({
    name: string().required()
  });
  const createStream = () =>
    new ReadableStream<InferType<typeof schema>>({
      pull(controller) {
        controller.enqueue({ name: 'Bob' });
        controller.enqueue({ name: '' });
        controller.enqueue({ name: 'Alice' });
        controller.close();
      }
    });
  const createCountStream = (store: { owners: number }) =>
    new WritableStream<InferType<typeof schema>>({
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

    await expect(actual()).rejects.toThrow(ValidationError);
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
