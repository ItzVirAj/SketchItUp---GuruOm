import { Queue, QueueEvents, JobsOptions } from 'bullmq';
import { createBullMQRedisConnection } from './queue-connection';
import { isRedisConnected } from './redis';

export interface GenerateInvoicePdfJobData {
  invoiceId: string;
  invoiceNo: string;
  customerName: string;
  totalAmount: number;
  date: string;
  dueDate: string;
  tenantId: string;
  recipientEmail?: string;
}

export interface SendEmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  messageId: string; // Idempotency key
  tenantId: string;
}

export interface CreateNotificationJobData {
  ruleId?: string;
  name: string;
  message: string;
  severity: 'INFO' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tenantId: string;
}

export type OwnerOSJobData =
  | { type: 'generate-invoice-pdf'; payload: GenerateInvoicePdfJobData }
  | { type: 'send-email'; payload: SendEmailJobData }
  | { type: 'create-notification'; payload: CreateNotificationJobData };

export const QUEUE_NAME = 'owner-os-jobs';

let jobsQueueInstance: Queue | null = null;
let queueEventsInstance: QueueEvents | null = null;

export function getJobsQueue(): Queue {
  if (!jobsQueueInstance) {
    const connection = createBullMQRedisConnection();
    jobsQueueInstance = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000 // 1s, 2s, 4s retry backoff
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 }
      }
    });
  }

  return jobsQueueInstance;
}

export function getQueueEvents(): QueueEvents {
  if (!queueEventsInstance) {
    const connection = createBullMQRedisConnection();
    queueEventsInstance = new QueueEvents(QUEUE_NAME, { connection });
  }

  return queueEventsInstance;
}

/**
 * Enqueues a typed background job without blocking the HTTP request thread.
 * Fail-safe: Does not throw if Redis is offline; logs warning so the DB record remains preserved.
 */
export async function enqueueJob(
  jobType: 'generate-invoice-pdf' | 'send-email' | 'create-notification',
  payload: any,
  options?: JobsOptions
): Promise<{ enqueued: boolean; jobId?: string }> {
  try {
    if (isRedisConnected()) {
      const queue = getJobsQueue();
      const job = await queue.add(jobType, payload, options);
      return { enqueued: true, jobId: job.id };
    }
  } catch (err: any) {
    console.warn(`⚠️ [BullMQ] Enqueue deferred for "${jobType}":`, err.message);
  }

  return { enqueued: false };
}

/**
 * Closes queue connections cleanly during shutdown.
 */
export async function closeQueues(): Promise<void> {
  if (jobsQueueInstance) {
    await jobsQueueInstance.close();
    jobsQueueInstance = null;
  }
  if (queueEventsInstance) {
    await queueEventsInstance.close();
    queueEventsInstance = null;
  }
}
