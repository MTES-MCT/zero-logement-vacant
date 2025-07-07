// job-manager-cli.ts
import 'dotenv/config';
import IORedis from 'ioredis';
import { Queue, Job } from 'bullmq';

interface JobError {
  reason: string;
  stack?: string[] | null;
  note?: string;
}

interface DelayInfo {
  delay?: number;
  processedOn?: number;
  finishedOn?: number;
}

interface JobResult {
  id: string;
  name: string;
  status: string;
  timestamp: number;
  attemptsMade: number;
  data: any;
  error: JobError | null;
  delayInfo: DelayInfo | null;
}

interface RetryResult {
  success: number;
  errors: string[];
}

type JobStatus = 'waiting' | 'delayed' | 'active' | 'completed' | 'failed';

/**
 * Validates if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Searches for all jobs with job.data.campaignId = campaignId
 */
async function findJobsByCampaign(
  queue: Queue,
  campaignId: string,
  statuses: JobStatus[] = ['waiting', 'delayed', 'active', 'completed', 'failed']
): Promise<JobResult[]> {
  const results: JobResult[] = [];
  const BATCH_SIZE = 100; // Process jobs in batches

  for (const status of statuses) {
    try {
      let start = 0;
      let totalJobsForStatus = 0;
      let foundJobsForStatus = 0;
      let hasMoreJobs = true;

      console.log(`Searching in status: ${status}`);

      while (hasMoreJobs && start <= 50000) {
        // Get jobs for ONE status at a time with proper pagination
        const jobs = await queue.getJobs([status], start, start + BATCH_SIZE - 1, true);
        
        if (jobs.length === 0) {
          hasMoreJobs = false;
          break;
        }

        totalJobsForStatus += jobs.length;

        for (const job of jobs) {
          if (job && job.data && job.data.campaignId === campaignId) {
            foundJobsForStatus++;
            
            // Get error information and additional details
            let errorInfo: JobError | null = null;
            let delayInfo: DelayInfo | null = null;
            
            if (status === 'failed' && job.failedReason) {
              errorInfo = {
                reason: job.failedReason,
                stack: job.stacktrace ? job.stacktrace.slice(0, 3) : null
              };
            }
            
            // For delayed jobs, get delay information and last failure reason
            if (status === 'delayed') {
              delayInfo = {
                delay: job.delay,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn
              };
              
              // If the job has attempts > 1, it likely failed before being delayed
              if (job.attemptsMade > 0 && job.failedReason) {
                errorInfo = {
                  reason: job.failedReason,
                  stack: job.stacktrace ? job.stacktrace.slice(0, 3) : null,
                  note: "Last failure before being delayed"
                };
              }
            }
            
            results.push({
              id: job.id!,
              name: job.name!,
              status: status,
              timestamp: job.timestamp,
              attemptsMade: job.attemptsMade,
              data: job.data,
              error: errorInfo,
              delayInfo: delayInfo,
            });
          }
        }

        start += BATCH_SIZE;

        // If we got less than BATCH_SIZE jobs, we've reached the end
        if (jobs.length < BATCH_SIZE) {
          hasMoreJobs = false;
        }
      }

      if (start > 50000) {
        console.log(`Warning: Stopped at ${start} jobs for status ${status} to avoid processing too many jobs`);
      }

      console.log(`Status ${status}: Found ${foundJobsForStatus} matching jobs out of ${totalJobsForStatus} total jobs`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not fetch jobs for status ${status}:`, errorMessage);
    }
  }
  return results;
}

/**
 * Creates and launches a new job
 */
async function createJob(
  queue: Queue,
  jobName: string,
  campaignId: string,
  establishmentId: string,
  additionalData: Record<string, any> = {}
): Promise<Job> {
  const jobData = {
    campaignId,
    establishmentId,
    ...additionalData
  };

  const job = await queue.add(jobName, jobData);
  return job;
}

/**
 * Retries failed and delayed jobs for a specific campaign
 */
async function retryJobsByCampaign(queue: Queue, campaignId: string): Promise<RetryResult> {
  console.log(`Looking for failed and delayed jobs with campaignId: ${campaignId}`);
  
  // Find failed and delayed jobs for this campaign
  const jobsToRetry = await findJobsByCampaign(queue, campaignId, ['failed', 'delayed']);
  
  if (jobsToRetry.length === 0) {
    console.log('No failed or delayed jobs found for this campaign.');
    return { success: 0, errors: [] };
  }

  console.log(`Found ${jobsToRetry.length} job(s) to retry:`);
  const failedCount = jobsToRetry.filter(j => j.status === 'failed').length;
  const delayedCount = jobsToRetry.filter(j => j.status === 'delayed').length;
  console.log(`  - ${failedCount} failed job(s)`);
  console.log(`  - ${delayedCount} delayed job(s)`);
  
  let successCount = 0;
  const errors: string[] = [];

  for (const jobInfo of jobsToRetry) {
    try {
      // Get the actual job object
      const job = await queue.getJob(jobInfo.id);
      
      if (!job) {
        errors.push(`Job ${jobInfo.id} not found`);
        continue;
      }

      // Handle different job states differently
      if (jobInfo.status === 'failed') {
        // For failed jobs, use retry()
        await job.retry();
        successCount++;
        console.log(`✅ Retried failed job ${job.id} (${job.name})`);
      } else if (jobInfo.status === 'delayed') {
        // For delayed jobs, promote them to run immediately
        await job.promote();
        successCount++;
        console.log(`✅ Promoted delayed job ${job.id} (${job.name}) to run immediately`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorMsg = `Failed to retry job ${jobInfo.id}: ${errorMessage}`;
      errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  }

  return { success: successCount, errors };
}

/**
 * Retries a specific job by ID
 */
async function retryJobById(queue: Queue, jobId: string): Promise<boolean> {
  try {
    const job = await queue.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // Check the current job state
    const jobState = await job.getState();
    
    if (jobState === 'failed') {
      // For failed jobs, use retry()
      await job.retry();
      console.log(`✅ Job ${jobId} (${job.name}) has been retried successfully`);
      return true;
    } else if (jobState === 'delayed') {
      // For delayed jobs, promote them to run immediately
      await job.promote();
      console.log(`✅ Job ${jobId} (${job.name}) has been promoted to run immediately`);
      return true;
    } else {
      console.log(`⚠️  Job ${jobId} is in '${jobState}' state. Can only retry 'failed' or promote 'delayed' jobs.`);
      return false;
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to retry job ${jobId}: ${errorMessage}`);
    return false;
  }
}

/**
 * Displays help information
 */
function showHelp(): void {
  console.log(`
Job Manager CLI

Usage:
  npx ts-node job-manager-cli.ts search <queueName> <campaignId>
  npx ts-node job-manager-cli.ts create <queueName> <jobName> <campaignId> <establishmentId>
  npx ts-node job-manager-cli.ts retry <queueName> <campaignId>
  npx ts-node job-manager-cli.ts retry <queueName> --job-id <jobId>

Commands:
  search    Search for jobs by campaignId
  create    Create and launch a new job
  retry     Retry failed and delayed jobs by campaignId or specific job by ID

Arguments:
  queueName        Name of the BullMQ queue
  campaignId       UUID of the campaign
  establishmentId  UUID of the establishment (for create command)
  jobName          Name of the job to create
  jobId            Specific job ID to retry

Examples:
  npx ts-node job-manager-cli.ts search email-queue 123e4567-e89b-12d3-a456-426614174000
  npx ts-node job-manager-cli.ts create email-queue send-newsletter 123e4567-e89b-12d3-a456-426614174000 987fcdeb-51d3-4a2b-9876-543210987654
  npx ts-node job-manager-cli.ts retry email-queue 123e4567-e89b-12d3-a456-426614174000
  npx ts-node job-manager-cli.ts retry email-queue --job-id 12345
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  const command = args[0];
  
  if (command === 'search') {
    const [, queueName, campaignId] = args;
    
    if (!queueName || !campaignId) {
      console.error('Error: Missing required arguments for search command');
      console.error('Usage: npx ts-node job-manager-cli.ts search <queueName> <campaignId>');
      process.exit(1);
    }

    if (!isValidUUID(campaignId)) {
      console.error('Error: campaignId must be a valid UUID');
      process.exit(1);
    }

    console.log(`Redis configuration: ${process.env.REDIS_URL}`);
    const connection = new IORedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
    const queue = new Queue(queueName, { connection });

    try {
      const matches = await findJobsByCampaign(queue, campaignId);
      console.log(`\n=== Results for campaignId="${campaignId}" in queue "${queueName}" ===\n`);
      console.log(`➡️ ${matches.length} job(s) found\n`);
      
      if (matches.length === 0) {
        console.log('No jobs found. This could mean:');
        console.log('- The campaignId does not exist in any jobs');
        console.log('- The jobs are in a different status than expected');
        console.log('- The queue name is incorrect');
        console.log('\nTry checking the BullMQ dashboard to verify the job status and data structure.');
      } else {
        matches.forEach(j => {
          console.log(`[${j.status}] id=${j.id} name=${j.name} attempts=${j.attemptsMade}`);
          console.log(`Data: ${JSON.stringify(j.data, null, 2)}`);
          
          // Display delay information for delayed jobs
          if (j.delayInfo && j.status === 'delayed') {
            if (j.delayInfo.delay) {
              console.log(`⏰ Delayed for: ${j.delayInfo.delay}ms`);
            }
            if (j.delayInfo.processedOn) {
              console.log(`📅 Last processed: ${new Date(j.delayInfo.processedOn).toISOString()}`);
            }
          }
          
          // Display error information for failed jobs or delayed jobs with previous failures
          if (j.error) {
            const prefix = j.error.note ? `❌ ${j.error.note}: ` : '❌ Error: ';
            console.log(`${prefix}${j.error.reason}`);
            if (j.error.stack) {
              console.log(`Stack trace (first 3 lines):`);
              j.error.stack.forEach(line => console.log(`   ${line}`));
            }
          }
          
          console.log('---');
        });
      }
    } finally {
      await queue.close();
      await connection.quit();
    }
  } 
  else if (command === 'create') {
    const [, queueName, jobName, campaignId, establishmentId] = args;
    
    if (!queueName || !jobName || !campaignId || !establishmentId) {
      console.error('Error: Missing required arguments for create command');
      console.error('Usage: npx ts-node job-manager-cli.ts create <queueName> <jobName> <campaignId> <establishmentId>');
      process.exit(1);
    }

    if (!isValidUUID(campaignId)) {
      console.error('Error: campaignId must be a valid UUID');
      process.exit(1);
    }

    if (!isValidUUID(establishmentId)) {
      console.error('Error: establishmentId must be a valid UUID');
      process.exit(1);
    }

    const connection = new IORedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
    const queue = new Queue(queueName, { connection });

    try {
      const job = await createJob(queue, jobName, campaignId, establishmentId);
      console.log(`\n✅ Job created successfully!`);
      console.log(`Job ID: ${job.id}`);
      console.log(`Job Name: ${job.name}`);
      console.log(`Queue: ${queueName}`);
      console.log(`Data: ${JSON.stringify(job.data, null, 2)}`);
    } finally {
      await queue.close();
      await connection.quit();
    }
  }
  else if (command === 'retry') {
    const [, queueName, campaignIdOrFlag, jobId] = args;
    
    if (!queueName) {
      console.error('Error: Missing queue name for retry command');
      console.error('Usage: npx ts-node job-manager-cli.ts retry <queueName> <campaignId>');
      console.error('   or: npx ts-node job-manager-cli.ts retry <queueName> --job-id <jobId>');
      process.exit(1);
    }

    const connection = new IORedis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');
    const queue = new Queue(queueName, { connection });

    try {
      // Check if it's a specific job ID retry
      if (campaignIdOrFlag === '--job-id') {
        if (!jobId) {
          console.error('Error: Missing job ID');
          console.error('Usage: npx ts-node job-manager-cli.ts retry <queueName> --job-id <jobId>');
          process.exit(1);
        }
        
        console.log(`\n=== Retrying job ${jobId} in queue "${queueName}" ===\n`);
        await retryJobById(queue, jobId);
      } 
      // Otherwise, it's a campaign-based retry
      else {
        const campaignId = campaignIdOrFlag;
        
        if (!campaignId) {
          console.error('Error: Missing campaignId');
          console.error('Usage: npx ts-node job-manager-cli.ts retry <queueName> <campaignId>');
          process.exit(1);
        }

        if (!isValidUUID(campaignId)) {
          console.error('Error: campaignId must be a valid UUID');
          process.exit(1);
        }

        console.log(`\n=== Retrying failed and delayed jobs for campaignId="${campaignId}" in queue "${queueName}" ===\n`);
        const result = await retryJobsByCampaign(queue, campaignId);
        
        console.log(`\n📊 Summary:`);
        console.log(`✅ Successfully retried: ${result.success} job(s)`);
        if (result.errors.length > 0) {
          console.log(`❌ Errors: ${result.errors.length}`);
          result.errors.forEach(error => console.log(`   - ${error}`));
        }
      }
    } finally {
      await queue.close();
      await connection.quit();
    }
  }
  else {
    console.error(`Error: Unknown command "${command}"`);
    console.error('Use --help to see available commands');
    process.exit(1);
  }
}

main().catch(err => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error('Error:', errorMessage);
  process.exit(1);
});