import { logger } from "./logger";

interface BatchOptions {
  batchSize?: number;
  delayMs?: number;
}

export class QueryOptimizer {
  async batchInsert<T>(
    db: any,
    tableName: string,
    records: T[],
    insertFn: (batch: T[]) => Promise<any>,
    options: BatchOptions = {}
  ): Promise<void> {
    const { batchSize = 100, delayMs = 0 } = options;
    
    if (records.length === 0) {
      return;
    }

    const batches = Math.ceil(records.length / batchSize);
    logger.debug('Starting batch insert', {
      tableName,
      totalRecords: records.length,
      batchSize,
      batches,
    }, 'queryOptimization');

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, records.length);
      const batch = records.slice(start, end);

      const startTime = Date.now();
      await insertFn(batch);
      const duration = Date.now() - startTime;

      logger.debug('Batch insert completed', {
        tableName,
        batchNumber: i + 1,
        batchSize: batch.length,
        durationMs: duration,
      }, 'queryOptimization');

      if (delayMs > 0 && i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.info('Batch insert complete', {
      tableName,
      totalRecords: records.length,
      batches,
    }, 'queryOptimization');
  }

  async batchUpdate<T extends { id: any }>(
    db: any,
    tableName: string,
    records: T[],
    updateFn: (record: T) => Promise<any>,
    options: BatchOptions = {}
  ): Promise<void> {
    const { batchSize = 50, delayMs = 0 } = options;

    if (records.length === 0) {
      return;
    }

    const batches = Math.ceil(records.length / batchSize);
    logger.debug('Starting batch update', {
      tableName,
      totalRecords: records.length,
      batchSize,
      batches,
    }, 'queryOptimization');

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, records.length);
      const batch = records.slice(start, end);

      const startTime = Date.now();
      await Promise.all(batch.map(record => updateFn(record)));
      const duration = Date.now() - startTime;

      logger.debug('Batch update completed', {
        tableName,
        batchNumber: i + 1,
        batchSize: batch.length,
        durationMs: duration,
      }, 'queryOptimization');

      if (delayMs > 0 && i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.info('Batch update complete', {
      tableName,
      totalRecords: records.length,
      batches,
    }, 'queryOptimization');
  }

  createQueryCache<T>(ttlMs: number = 60000): {
    get: (key: string) => T | null;
    set: (key: string, value: T) => void;
    invalidate: (key: string) => void;
    clear: () => void;
  } {
    const cache = new Map<string, { data: T; expiresAt: number }>();

    return {
      get: (key: string) => {
        const entry = cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
          cache.delete(key);
          return null;
        }
        return entry.data;
      },
      set: (key: string, value: T) => {
        cache.set(key, {
          data: value,
          expiresAt: Date.now() + ttlMs,
        });
      },
      invalidate: (key: string) => {
        cache.delete(key);
      },
      clear: () => {
        cache.clear();
      },
    };
  }
}

export const queryOptimizer = new QueryOptimizer();
