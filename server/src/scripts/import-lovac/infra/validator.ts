import { isDate } from 'date-fns';
import { TransformStream } from 'node:stream/web';

import { createLogger } from '~/infra/logger';
import {
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra/index';

const logger = createLogger('validator');

type ValidatorOptions<A> = ReporterOptions<A>;

// Accepts both yup schemas ({ validateSync }) and zod schemas ({ parse })
type AnySchema<A> =
  | { parse(value: unknown): A }
  | { validateSync(value: unknown, options?: unknown): A };

function validator<A>(schema: AnySchema<A>, options: ValidatorOptions<A>) {
  return new TransformStream<unknown, A>({
    transform(chunk, controller) {
      logger.debug('Validating chunk...', { chunk });
      try {
        const validated =
          'parse' in schema ? schema.parse(chunk) : schema.validateSync(chunk);
        controller.enqueue(validated);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        options?.reporter?.failed(
          chunk as A,
          new ReporterError(message, chunk as A)
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
