import createWorkerGenerateMails from './generate-mails';
import { createLogger } from '../logger';

export default function createWorkers() {
  const logger = createLogger('workers');
  const workers = [createWorkerGenerateMails()];
  logger.info('Workers started');
  return workers;
}
