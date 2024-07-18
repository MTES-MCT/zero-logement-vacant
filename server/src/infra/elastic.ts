import { Client } from '@elastic/elasticsearch';
import { logger } from '~/infra/logger';
import config from '~/infra/config';

const client = new Client({
  node: config.elastic.node,
  auth: {
    username: config.elastic.auth.username,
    password: config.elastic.auth.password,
  },
});

type ExecutionStatus = | 'SUCCESS'
| 'FAIL'
| 'PENDING'
| 'RUNNING'
| 'CANCELLED'
| 'TIMEOUT'
| 'RETRY'
| 'ERROR'
| 'QUEUED'
| 'SKIPPED';

interface ExecutionLog {
  _source: {
    timestamp: string;
  };
}

interface ApiResponse {
  hits: {
    hits: ExecutionLog[];
  };
}

export async function logScriptExecution(scriptName: string, status: ExecutionStatus, message: string) {
  try {
    await client.index({
      index: `script_executions_${config.elastic.env}`,
      body: {
        timestamp: new Date().toISOString(),
        script_name: scriptName,
        status: status,
        message: message,
      },
    });
    logger.debug('Log script execution successfully');
  } catch (error) {
    logger.error('Error indexing log:', error);
  }
}

export async function getLastScriptExecutionDate(script_name: string): Promise<string | null> {
  try {
    const response = await client.search({
      index: `script_executions_${config.elastic.env}`,
      size: 1,
      sort: [
        {
          timestamp: {
            order: 'desc',
          },
        }
      ],
      query: {
        bool: {
          must: [
            { match: { script_name: script_name, }, },
            { match: { status: 'SUCCESS', }, }
          ],
        },
      },
    }) as ApiResponse;

    if (response.hits.hits.length > 0) {
      const lastExecutionLog = response.hits.hits[0] as ExecutionLog;
      const lastExecutionDate = lastExecutionLog._source.timestamp;
      return lastExecutionDate;
    } else {
      logger.info(`No execution logs found for "${script_name}" script`);
      return null;
    }
  } catch (error) {
    logger.error('Error retrieving last execution date:', error);
    return null;
  }
}
