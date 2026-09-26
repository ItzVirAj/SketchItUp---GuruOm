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

export interface CaptureDailySnapshotJobData { date?: string }
// add to the OwnerOSJobData union:
// | { type: 'capture-daily-snapshot'; payload: CaptureDailySnapshotJobData }

// export async function registerDailySnapshotSchedule(): Promise<void> {
//   try {
//     if (!isRedisConnected()) return;
//     await getJobsQueue().upsertJobScheduler(
//       'daily-snapshot-scheduler',
//       { pattern: '5 0 * * *', tz: 'Asia/Kolkata' },
//       { name: 'capture-daily-snapshot', data: {} }
//     );
//     console.log('⏰ [BullMQ] Daily snapshot scheduler registered (00:05 IST).');
//   } catch (err: any) {
//     console.warn('⚠️ [BullMQ] Could not register daily snapshot scheduler:', err.message);
//   }
  
// }

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

export interface MeetingReminderJobData {
  meetingId: string;
  title: string;
  startTime: string; // ISO 8601
  meetingLink?: string;
  attendeeUserIds: string[];
  offsetLabel: string; // e.g. '24h_before', '15m_before'
}

export interface TaskReminderJobData {
  taskId: string;
  title: string;
  dueDate: string; // ISO 8601
  assigneeUserIds: string[];
  offsetLabel: string; // e.g. '24h_before_due'
}

export interface CertificationReminderJobData {
  certificationId: string;
  name: string;
  expiryDate: string; // ISO 8601
  employeeId: string;
  offsetLabel: string; // e.g. '30d_before_expiry'
}

export interface CaptureDailySnapshotJobData {
  date?: string; // 'YYYY-MM-DD'; omit to snapshot "today"
}

export type OwnerOSJobData =
  | { type: 'generate-invoice-pdf'; payload: GenerateInvoicePdfJobData }
  | { type: 'send-email'; payload: SendEmailJobData }
  | { type: 'create-notification'; payload: CreateNotificationJobData }
  | { type: 'meeting-reminder'; payload: MeetingReminderJobData }
  | { type: 'task-reminder'; payload: TaskReminderJobData }
  | { type: 'certification-reminder'; payload: CertificationReminderJobData }
  | { type: 'capture-daily-snapshot'; payload: CaptureDailySnapshotJobData };

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
  jobType: 'generate-invoice-pdf' | 'send-email' | 'create-notification' | 'meeting-reminder' | 'task-reminder' | 'certification-reminder' | 'capture-daily-snapshot',
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
 * Registers (or updates) the once-a-day snapshot job. Idempotent — safe to
 * call on every worker boot, BullMQ upserts by scheduler id instead of
 * duplicating it.
 */
export async function registerDailySnapshotSchedule(): Promise<void> {
  try {
    if (!isRedisConnected()) return;
    await getJobsQueue().upsertJobScheduler(
      'daily-snapshot-scheduler',
      { pattern: '5 0 * * *', tz: 'Asia/Kolkata' }, // 00:05 IST daily
      { name: 'capture-daily-snapshot', data: {} }
    );
    console.log('⏰ [BullMQ] Daily snapshot scheduler registered (00:05 IST).');
  } catch (err: any) {
    console.warn('⚠️ [BullMQ] Could not register daily snapshot scheduler:', err.message);
  }
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
