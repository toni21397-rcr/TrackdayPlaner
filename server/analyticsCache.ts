import type { MaintenanceTask } from "@shared/schema";
import { logger } from "./logger";

interface AnalyticsCacheEntry<T> {
  data: T;
  fetchedAt: Date;
  expiresAt: Date;
}

interface MaintenanceAnalytics {
  totalTasks: number;
  completedTasks: number;
  dismissedTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  completionRate: number;
  averageCompletionTimeDays: number;
  tasksByStatus: {
    pending: number;
    due: number;
    overdue: number;
    snoozed: number;
    completed: number;
    dismissed: number;
  };
  tasksByVehicle: Array<{
    vehicleId: string;
    vehicleName: string;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
  }>;
}

interface EnrichedTask extends MaintenanceTask {
  vehicle: any;
  planName: string;
  checklistItemTitle: string;
  maintenanceType: string | null;
  isCritical: boolean;
  effectiveStatus: string;
  isOverdue: boolean;
}

export class AnalyticsCache {
  private maintenanceAnalyticsCache = new Map<string, AnalyticsCacheEntry<MaintenanceAnalytics>>();
  private enrichedTasksCache = new Map<string, AnalyticsCacheEntry<EnrichedTask[]>>();
  
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  
  private getCacheKey(userId: string, type: 'analytics' | 'tasks'): string {
    return `${type}:${userId}`;
  }
  
  private isExpired(entry: AnalyticsCacheEntry<any>): boolean {
    return new Date() > entry.expiresAt;
  }
  
  getMaintenanceAnalytics(userId: string): MaintenanceAnalytics | null {
    const key = this.getCacheKey(userId, 'analytics');
    const entry = this.maintenanceAnalyticsCache.get(key);
    
    if (!entry) {
      logger.debug('Analytics cache miss', {
        type: 'maintenanceAnalytics',
        userId,
        reason: 'notFound',
      }, 'analyticsCache');
      return null;
    }
    
    if (this.isExpired(entry)) {
      const ageMs = new Date().getTime() - entry.fetchedAt.getTime();
      logger.debug('Analytics cache miss - expired', {
        type: 'maintenanceAnalytics',
        userId,
        ageMs,
      }, 'analyticsCache');
      this.maintenanceAnalyticsCache.delete(key);
      return null;
    }
    
    const cacheAge = new Date().getTime() - entry.fetchedAt.getTime();
    logger.debug('Analytics cache hit', {
      type: 'maintenanceAnalytics',
      userId,
      cacheAgeMs: cacheAge,
      ttlMs: this.defaultTTL,
    }, 'analyticsCache');
    
    return entry.data;
  }
  
  setMaintenanceAnalytics(userId: string, data: MaintenanceAnalytics): void {
    const key = this.getCacheKey(userId, 'analytics');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.defaultTTL);
    
    this.maintenanceAnalyticsCache.set(key, {
      data,
      fetchedAt: now,
      expiresAt,
    });
    
    logger.debug('Analytics cache set', {
      type: 'maintenanceAnalytics',
      userId,
      ttlMs: this.defaultTTL,
      totalTasks: data.totalTasks,
    }, 'analyticsCache');
  }
  
  getEnrichedTasks(userId: string): EnrichedTask[] | null {
    const key = this.getCacheKey(userId, 'tasks');
    const entry = this.enrichedTasksCache.get(key);
    
    if (!entry) {
      logger.debug('Analytics cache miss', {
        type: 'enrichedTasks',
        userId,
        reason: 'notFound',
      }, 'analyticsCache');
      return null;
    }
    
    if (this.isExpired(entry)) {
      const ageMs = new Date().getTime() - entry.fetchedAt.getTime();
      logger.debug('Analytics cache miss - expired', {
        type: 'enrichedTasks',
        userId,
        ageMs,
      }, 'analyticsCache');
      this.enrichedTasksCache.delete(key);
      return null;
    }
    
    const cacheAge = new Date().getTime() - entry.fetchedAt.getTime();
    logger.debug('Analytics cache hit', {
      type: 'enrichedTasks',
      userId,
      cacheAgeMs: cacheAge,
      ttlMs: this.defaultTTL,
      taskCount: entry.data.length,
    }, 'analyticsCache');
    
    return entry.data;
  }
  
  setEnrichedTasks(userId: string, data: EnrichedTask[]): void {
    const key = this.getCacheKey(userId, 'tasks');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.defaultTTL);
    
    this.enrichedTasksCache.set(key, {
      data,
      fetchedAt: now,
      expiresAt,
    });
    
    logger.debug('Analytics cache set', {
      type: 'enrichedTasks',
      userId,
      ttlMs: this.defaultTTL,
      taskCount: data.length,
    }, 'analyticsCache');
  }
  
  invalidateUser(userId: string): void {
    const analyticsKey = this.getCacheKey(userId, 'analytics');
    const tasksKey = this.getCacheKey(userId, 'tasks');
    
    const analyticsDeleted = this.maintenanceAnalyticsCache.delete(analyticsKey);
    const tasksDeleted = this.enrichedTasksCache.delete(tasksKey);
    
    if (analyticsDeleted || tasksDeleted) {
      logger.debug('Analytics cache invalidated', {
        userId,
        analyticsDeleted,
        tasksDeleted,
      }, 'analyticsCache');
    }
  }
  
  invalidateAll(): void {
    const analyticsCount = this.maintenanceAnalyticsCache.size;
    const tasksCount = this.enrichedTasksCache.size;
    
    this.maintenanceAnalyticsCache.clear();
    this.enrichedTasksCache.clear();
    
    logger.info('Analytics cache invalidated (all users)', {
      analyticsEntriesRemoved: analyticsCount,
      tasksEntriesRemoved: tasksCount,
    }, 'analyticsCache');
  }
  
  getCacheStats(): {
    maintenanceAnalytics: { total: number; expired: number };
    enrichedTasks: { total: number; expired: number };
  } {
    const now = new Date();
    
    let analyticsExpired = 0;
    for (const entry of this.maintenanceAnalyticsCache.values()) {
      if (entry.expiresAt < now) analyticsExpired++;
    }
    
    let tasksExpired = 0;
    for (const entry of this.enrichedTasksCache.values()) {
      if (entry.expiresAt < now) tasksExpired++;
    }
    
    return {
      maintenanceAnalytics: {
        total: this.maintenanceAnalyticsCache.size,
        expired: analyticsExpired,
      },
      enrichedTasks: {
        total: this.enrichedTasksCache.size,
        expired: tasksExpired,
      },
    };
  }
  
  async cleanupExpired(): Promise<void> {
    const startTime = Date.now();
    const now = new Date();
    
    let analyticsRemoved = 0;
    for (const [key, entry] of this.maintenanceAnalyticsCache.entries()) {
      if (entry.expiresAt < now) {
        this.maintenanceAnalyticsCache.delete(key);
        analyticsRemoved++;
      }
    }
    
    let tasksRemoved = 0;
    for (const [key, entry] of this.enrichedTasksCache.entries()) {
      if (entry.expiresAt < now) {
        this.enrichedTasksCache.delete(key);
        tasksRemoved++;
      }
    }
    
    const durationMs = Date.now() - startTime;
    
    logger.debug('Analytics cache cleanup', {
      analyticsRemoved,
      tasksRemoved,
      durationMs,
    }, 'analyticsCache');
  }
}

export const analyticsCache = new AnalyticsCache();

export function startAnalyticsCacheCleanup() {
  const cleanupInterval = 15 * 60 * 1000; // 15 minutes
  
  logger.info(`Starting periodic analytics cache cleanup (${cleanupInterval / 60000}min interval)`, {}, 'analyticsCache');
  
  setInterval(async () => {
    await analyticsCache.cleanupExpired();
  }, cleanupInterval);
  
  logger.info('Performing initial analytics cache cleanup', {}, 'analyticsCache');
  analyticsCache.cleanupExpired().then(() => {
    const stats = analyticsCache.getCacheStats();
    logger.debug('Analytics cache initial cleanup complete', {
      stats,
    }, 'analyticsCache');
  });
}
