import type { MaintenanceTask } from "@shared/schema";

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
      console.log(JSON.stringify({
        action: 'analyticsCacheMiss',
        type: 'maintenanceAnalytics',
        userId,
        reason: 'notFound',
      }));
      return null;
    }
    
    if (this.isExpired(entry)) {
      console.log(JSON.stringify({
        action: 'analyticsCacheMiss',
        type: 'maintenanceAnalytics',
        userId,
        reason: 'expired',
        ageMs: new Date().getTime() - entry.fetchedAt.getTime(),
      }));
      this.maintenanceAnalyticsCache.delete(key);
      return null;
    }
    
    const cacheAge = new Date().getTime() - entry.fetchedAt.getTime();
    console.log(JSON.stringify({
      action: 'analyticsCacheHit',
      type: 'maintenanceAnalytics',
      userId,
      cacheAgeMs: cacheAge,
      ttlMs: this.defaultTTL,
    }));
    
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
    
    console.log(JSON.stringify({
      action: 'analyticsCacheSet',
      type: 'maintenanceAnalytics',
      userId,
      ttlMs: this.defaultTTL,
      totalTasks: data.totalTasks,
    }));
  }
  
  getEnrichedTasks(userId: string): EnrichedTask[] | null {
    const key = this.getCacheKey(userId, 'tasks');
    const entry = this.enrichedTasksCache.get(key);
    
    if (!entry) {
      console.log(JSON.stringify({
        action: 'analyticsCacheMiss',
        type: 'enrichedTasks',
        userId,
        reason: 'notFound',
      }));
      return null;
    }
    
    if (this.isExpired(entry)) {
      console.log(JSON.stringify({
        action: 'analyticsCacheMiss',
        type: 'enrichedTasks',
        userId,
        reason: 'expired',
        ageMs: new Date().getTime() - entry.fetchedAt.getTime(),
      }));
      this.enrichedTasksCache.delete(key);
      return null;
    }
    
    const cacheAge = new Date().getTime() - entry.fetchedAt.getTime();
    console.log(JSON.stringify({
      action: 'analyticsCacheHit',
      type: 'enrichedTasks',
      userId,
      cacheAgeMs: cacheAge,
      ttlMs: this.defaultTTL,
      taskCount: entry.data.length,
    }));
    
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
    
    console.log(JSON.stringify({
      action: 'analyticsCacheSet',
      type: 'enrichedTasks',
      userId,
      ttlMs: this.defaultTTL,
      taskCount: data.length,
    }));
  }
  
  invalidateUser(userId: string): void {
    const analyticsKey = this.getCacheKey(userId, 'analytics');
    const tasksKey = this.getCacheKey(userId, 'tasks');
    
    const analyticsDeleted = this.maintenanceAnalyticsCache.delete(analyticsKey);
    const tasksDeleted = this.enrichedTasksCache.delete(tasksKey);
    
    if (analyticsDeleted || tasksDeleted) {
      console.log(JSON.stringify({
        action: 'analyticsCacheInvalidate',
        userId,
        analyticsDeleted,
        tasksDeleted,
      }));
    }
  }
  
  invalidateAll(): void {
    const analyticsCount = this.maintenanceAnalyticsCache.size;
    const tasksCount = this.enrichedTasksCache.size;
    
    this.maintenanceAnalyticsCache.clear();
    this.enrichedTasksCache.clear();
    
    console.log(JSON.stringify({
      action: 'analyticsCacheInvalidateAll',
      analyticsEntriesRemoved: analyticsCount,
      tasksEntriesRemoved: tasksCount,
    }));
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
    
    console.log(JSON.stringify({
      action: 'analyticsCacheCleanup',
      analyticsRemoved,
      tasksRemoved,
      durationMs,
    }));
  }
}

export const analyticsCache = new AnalyticsCache();

export function startAnalyticsCacheCleanup() {
  const cleanupInterval = 15 * 60 * 1000; // 15 minutes
  
  console.log(`Starting periodic analytics cache cleanup (${cleanupInterval / 60000}min interval)`);
  
  setInterval(async () => {
    await analyticsCache.cleanupExpired();
  }, cleanupInterval);
  
  console.log('Performing initial analytics cache cleanup...');
  analyticsCache.cleanupExpired().then(() => {
    const stats = analyticsCache.getCacheStats();
    console.log(JSON.stringify({
      action: 'analyticsCacheInitialCleanup',
      stats,
    }));
  });
}
