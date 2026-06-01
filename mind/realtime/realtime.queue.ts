/**
 * @keywords    in-process job queue, priority job queue, job retry with backoff, dead letter queue, task scheduling, concurrency-limited worker pool
 * @domain      Realtime Queue
 * @use-when    Building an in-process job queue with priorities, retries, and concurrency control
 * @not-when    You need distributed queuing across processes — use Redis/BullMQ/SQS for that
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "dead";

export interface Job<T = unknown> {
  id: string;
  type: string;
  payload: T;
  priority: number;    // Higher = processed first
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  scheduledAt: number; // Can be future timestamp for delayed jobs
  processedAt?: number;
  completedAt?: number;
  error?: string;
  status: JobStatus;
}

export interface QueueConfig {
  concurrency?: number;          // Max parallel workers
  defaultMaxAttempts?: number;
  defaultPriority?: number;
  retryDelayMs?: number;
  retryBackoff?: "fixed" | "exponential";
  deadLetterEnabled?: boolean;
  onJobCompleted?: (job: Job) => void;
  onJobFailed?: (job: Job, error: Error) => void;
  onJobDead?: (job: Job) => void;
}

type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

// ─── Priority Queue (Min-Heap) ────────────────────────────────────────────────
// Jobs sorted by (priority DESC, scheduledAt ASC) — highest priority, earliest scheduled first

class PriorityQueue<T> {
  private heap: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  push(item: T): void {
    this.heap.push(item);
    this.siftUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  peek(): T | undefined { return this.heap[0]; }
  get size(): number { return this.heap.length; }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.heap[i], this.heap[parent]) < 0) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
        i = parent;
      } else break;
    }
  }

  private siftDown(i: number): void {
    while (true) {
      let best = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < this.heap.length && this.compare(this.heap[l], this.heap[best]) < 0) best = l;
      if (r < this.heap.length && this.compare(this.heap[r], this.heap[best]) < 0) best = r;
      if (best === i) break;
      [this.heap[i], this.heap[best]] = [this.heap[best], this.heap[i]];
      i = best;
    }
  }
}

// ─── JobQueue ─────────────────────────────────────────────────────────────────

export class JobQueue {
  private config: Required<QueueConfig>;
  private queue: PriorityQueue<Job>;
  private handlers: Map<string, JobHandler> = new Map();
  private activeJobs: Set<string> = new Set();
  private deadLetterQueue: Job[] = [];
  private processingLoop: ReturnType<typeof setTimeout> | null = null;
  private delayedTimer: ReturnType<typeof setTimeout> | null = null;
  private stats = { completed: 0, failed: 0, dead: 0 };

  constructor(config: QueueConfig = {}) {
    this.config = {
      concurrency: config.concurrency ?? 5,
      defaultMaxAttempts: config.defaultMaxAttempts ?? 3,
      defaultPriority: config.defaultPriority ?? 0,
      retryDelayMs: config.retryDelayMs ?? 1000,
      retryBackoff: config.retryBackoff ?? "exponential",
      deadLetterEnabled: config.deadLetterEnabled ?? true,
      onJobCompleted: config.onJobCompleted ?? (() => {}),
      onJobFailed: config.onJobFailed ?? (() => {}),
      onJobDead: config.onJobDead ?? (() => {}),
    };

    // Min-heap: highest priority first, then earliest scheduled
    this.queue = new PriorityQueue<Job>((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.scheduledAt - b.scheduledAt;
    });
  }

  register<T>(type: string, handler: JobHandler<T>): this {
    this.handlers.set(type, handler as JobHandler);
    return this;
  }

  enqueue<T>(
    type: string,
    payload: T,
    options: {
      priority?: number;
      maxAttempts?: number;
      delayMs?: number;
    } = {}
  ): Job<T> {
    const job: Job<T> = {
      id: crypto.randomUUID(),
      type,
      payload,
      priority: options.priority ?? this.config.defaultPriority,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? this.config.defaultMaxAttempts,
      createdAt: Date.now(),
      scheduledAt: Date.now() + (options.delayMs ?? 0),
      status: "pending",
    };

    this.queue.push(job as Job);
    this.scheduleProcessing();
    return job;
  }

  start(): void {
    this.scheduleProcessing();
  }

  pause(): void {
    if (this.processingLoop) clearTimeout(this.processingLoop);
    this.processingLoop = null;
  }

  get queueSize(): number { return this.queue.size; }
  get activeCount(): number { return this.activeJobs.size; }
  get deadLetterCount(): number { return this.deadLetterQueue.length; }
  get completedCount(): number { return this.stats.completed; }

  drainDeadLetter(): Job[] {
    const items = [...this.deadLetterQueue];
    this.deadLetterQueue = [];
    return items;
  }

  private scheduleProcessing(): void {
    if (this.processingLoop !== null) return;
    this.processingLoop = setTimeout(() => {
      this.processingLoop = null;
      this.process();
    }, 0);
  }

  private async process(): Promise<void> {
    const now = Date.now();

    while (
      this.activeJobs.size < this.config.concurrency &&
      this.queue.size > 0 &&
      (this.queue.peek()?.scheduledAt ?? 0) <= now
    ) {
      const job = this.queue.pop();
      if (!job) break;

      this.activeJobs.add(job.id);
      this.runJob(job).finally(() => {
        this.activeJobs.delete(job.id);
        this.scheduleProcessing();
      });
    }

    // If there are delayed jobs, schedule wakeup for the earliest
    const next = this.queue.peek();
    if (next && next.scheduledAt > now) {
      if (this.delayedTimer) clearTimeout(this.delayedTimer);
      this.delayedTimer = setTimeout(() => {
        this.delayedTimer = null;
        this.scheduleProcessing();
      }, next.scheduledAt - now);
    }
  }

  private async runJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = "dead";
      job.error = `No handler registered for job type "${job.type}"`;
      this.moveToDead(job);
      return;
    }

    job.status = "processing";
    job.attempts++;
    job.processedAt = Date.now();

    try {
      await handler(job);
      job.status = "completed";
      job.completedAt = Date.now();
      this.stats.completed++;
      this.config.onJobCompleted(job);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      job.error = error.message;
      this.stats.failed++;
      this.config.onJobFailed(job, error);

      if (job.attempts < job.maxAttempts) {
        // Schedule retry with backoff
        const delay = this.config.retryBackoff === "exponential"
          ? this.config.retryDelayMs * Math.pow(2, job.attempts - 1)
          : this.config.retryDelayMs;
        job.scheduledAt = Date.now() + delay;
        job.status = "pending";
        this.queue.push(job);
      } else {
        job.status = "dead";
        this.moveToDead(job);
      }
    }
  }

  private moveToDead(job: Job): void {
    this.stats.dead++;
    if (this.config.deadLetterEnabled) this.deadLetterQueue.push(job);
    this.config.onJobDead(job);
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createJobQueue(config?: QueueConfig): JobQueue {
  return new JobQueue(config);
}

/*
 * Usage Example:
 *
 * const queue = createJobQueue({ concurrency: 10, retryBackoff: "exponential" });
 *
 * queue.register<{ userId: string }>("send-email", async (job) => {
 *   await emailService.send(job.payload.userId);
 * });
 *
 * queue.register<{ orderId: string }>("process-payment", async (job) => {
 *   await paymentService.charge(job.payload.orderId);
 * });
 *
 * queue.start();
 *
 * // High-priority immediate job
 * queue.enqueue("send-email", { userId: "u-42" }, { priority: 10 });
 *
 * // Low-priority delayed job (run in 5 minutes)
 * queue.enqueue("process-payment", { orderId: "o-99" }, { priority: 0, delayMs: 300_000 });
 */
