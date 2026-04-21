import { isDate } from 'date-fns';
import { TransformStream } from 'node:stream/web';
import z, { ZodType } from 'zod';

import { createLogger } from '~/infra/logger';
import {
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra/index';

const logger = createLogger('validator');

type ValidatorOptions<A> = ReporterOptions<A>;

function validator<A>(schema: ZodType<A>, options: ValidatorOptions<A>) {
  return new TransformStream<unknown, A>({
    transform(chunk, controller) {
      logger.debug('Validating chunk...', { chunk });
      const validated = schema.safeParse(chunk);
      if (validated.success) {
        controller.enqueue(validated.data);
      } else {
        const error = z.prettifyError(validated.error);
        options?.reporter?.failed(
          chunk as A,
          new ReporterError(error, chunk as A)
        );
        if (options.abortEarly) {
          controller.error(error);
        }
      }
    }
  });
}

export function toDate(value: any, originalValue: any): Date | undefined {
  const date =
    typeof originalValue === 'number' ? new Date(originalValue * 1000) : value;

  return isDate(date) ? date : value;
}

export default validator;
