import { TransformStream } from 'node:stream/web';
import { Schema, ValidationError } from 'yup';

import { createLogger } from '~/infra/logger';
import {
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra/index';

const logger = createLogger('validator');

type ValidatorOptions<A> = ReporterOptions<A>;

function validator<A>(schema: Schema<A>, opts: ValidatorOptions<A>) {
  return new TransformStream<A, A>({
    transform(chunk, controller) {
      try {
        logger.debug('Validating chunk...', { chunk });
        const validated = schema.validateSync(chunk);
        controller.enqueue(validated);
      } catch (error) {
        if (error instanceof ValidationError) {
          opts?.reporter?.failed(
            chunk,
            new ReporterError(error.message, chunk)
          );
          return;
        }

        controller.error(error);
      }
    }
  });
}

export default validator;
