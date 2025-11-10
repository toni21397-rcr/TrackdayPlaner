import type { IStorage } from "./storage.ts";
import type { 
  MaintenancePlan, 
  VehiclePlan, 
  PlanChecklistItem,
  MaintenanceTask,
  CadenceConfig 
} from "@shared/schema";
import { format, addDays, addMonths, parseISO, isBefore, isAfter } from "date-fns";
import { logger } from "./logger";

/**
 * TriggerProcessor - Service to process maintenance plan triggers and generate tasks
 * 
 * Responsibilities:
 * - Scan active vehicle plans
 * - Process different trigger types (trackday, time_interval, odometer, engine_hours)
 * - Generate maintenance tasks based on checklist items
 * - Calculate due dates with offsets
 * - Avoid duplicate task generation
 */
export class TriggerProcessor {
  constructor(private storage: IStorage) {}

  /**
   * Main entry point - process all active vehicle plans
   */
  async processAllTriggers(): Promise<void> {
    logger.info('Starting trigger processing', {}, 'triggerProcessor');
    
    // Get all active vehicle plans
    const vehiclePlans = await this.storage.getVehiclePlans({ status: "active" });
    logger.info('Found active vehicle plans', { count: vehiclePlans.length }, 'triggerProcessor');
    
    for (const vehiclePlan of vehiclePlans) {
      try {
        await this.processVehiclePlan(vehiclePlan);
      } catch (error) {
        logger.error('Error processing vehicle plan', {
          vehiclePlanId: vehiclePlan.id,
          error: error instanceof Error ? error.message : String(error),
        }, 'triggerProcessor');
      }
    }
    
    logger.info('Trigger processing complete', {}, 'triggerProcessor');
  }

  /**
   * Process a single vehicle plan
   */
  private async processVehiclePlan(vehiclePlan: VehiclePlan): Promise<void> {
    // Get the maintenance plan
    const plan = await this.storage.getMaintenancePlan(vehiclePlan.planId);
    if (!plan) {
      logger.warn('Plan not found for vehicle plan', {
        planId: vehiclePlan.planId,
        vehiclePlanId: vehiclePlan.id,
      }, 'triggerProcessor');
      return;
    }

    // Get checklist items for this plan
    const checklistItems = await this.storage.getPlanChecklistItems(plan.id);
    if (checklistItems.length === 0) {
      logger.debug('No checklist items for plan', { planId: plan.id }, 'triggerProcessor');
      return;
    }

    // Get existing tasks to avoid duplicates
    const existingTasksResult = await this.storage.getMaintenanceTasks({ vehiclePlanId: vehiclePlan.id, limit: 10000 });
    const existingTasks = existingTasksResult.items;

    // Process based on cadence type
    switch (plan.cadenceType) {
      case "trackday":
        await this.processTrackdayTrigger(vehiclePlan, plan, checklistItems, existingTasks);
        break;
      case "time_interval":
        await this.processTimeIntervalTrigger(vehiclePlan, plan, checklistItems, existingTasks);
        break;
      case "odometer":
        await this.processOdometerTrigger(vehiclePlan, plan, checklistItems, existingTasks);
        break;
      case "engine_hours":
        await this.processEngineHoursTrigger(vehiclePlan, plan, checklistItems, existingTasks);
        break;
      default:
        logger.warn('Unknown cadence type', { cadenceType: plan.cadenceType }, 'triggerProcessor');
    }
  }

  /**
   * Process trackday-based triggers
   * Generates tasks based on completed trackday cadence (e.g., after every N trackdays)
   */
  private async processTrackdayTrigger(
    vehiclePlan: VehiclePlan,
    plan: MaintenancePlan,
    checklistItems: PlanChecklistItem[],
    existingTasks: MaintenanceTask[]
  ): Promise<void> {
    const config = plan.cadenceConfig.trackday;
    if (!config) {
      logger.warn('No trackday config for plan', { planId: plan.id }, 'triggerProcessor');
      return;
    }

    const afterEveryN = config.afterEveryN || 1;
    
    // Get vehicle
    const vehicle = await this.storage.getVehicle(vehiclePlan.vehicleId);
    if (!vehicle) return;

    // Get all trackdays for this vehicle
    const allTrackdaysResult = await this.storage.getTrackdays({ limit: 10000 });
    const vehicleTrackdays = allTrackdaysResult.items
      .filter((td: any) => td.vehicleId === vehicle.id)
      .sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));

    const activationDate = parseISO(vehiclePlan.activationDate);
    const now = new Date();
    
    // Count PAST/COMPLETED trackdays since activation (only those in the past)
    const completedTrackdays = vehicleTrackdays
      .filter((td: any) => {
        const tdDate = parseISO(td.startDate);
        return isAfter(tdDate, activationDate) && isBefore(tdDate, now);
      });
    
    const completedCount = completedTrackdays.length;

    // Get upcoming trackdays (in the future)
    const upcomingTrackdays = vehicleTrackdays
      .filter((td: any) => isAfter(parseISO(td.startDate), now));

    // Calculate when next maintenance is due
    // If completedCount is exactly a multiple of afterEveryN (and > 0), maintenance is due NOW (next trackday)
    // Otherwise, calculate how many more trackdays until we hit the next multiple
    let triggerTrackday = null;
    
    if (completedCount > 0 && completedCount % afterEveryN === 0) {
      // We've just completed a cadence cycle - maintenance due for next trackday
      if (upcomingTrackdays.length > 0) {
        triggerTrackday = upcomingTrackdays[0];
      }
    } else {
      // Calculate how many more trackdays until next maintenance
      const trackdaysUntilNextTrigger = afterEveryN - (completedCount % afterEveryN);
      
      // Check if we have enough upcoming trackdays
      if (upcomingTrackdays.length >= trackdaysUntilNextTrigger) {
        triggerTrackday = upcomingTrackdays[trackdaysUntilNextTrigger - 1];
      }
    }

    // Create tasks for the trigger trackday if found
    if (triggerTrackday) {

      for (const item of checklistItems) {
        // Check if task already exists for this trackday and checklist item
        const taskExists = existingTasks.some(task => 
          task.checklistItemId === item.id &&
          task.triggerContext?.trackdayId === triggerTrackday.id
        );

        if (!taskExists) {
          // Calculate due date based on offset
          const trackdayDate = parseISO(triggerTrackday.startDate);
          const dueDate = addDays(trackdayDate, item.defaultDueOffset.days || 0);

          await this.createTask(vehiclePlan.id, item, dueDate, {
            trackdayId: triggerTrackday.id,
            triggerType: "trackday",
            completedTrackdaysCount: completedCount,
            afterEveryN,
          });
        }
      }
    }
  }

  /**
   * Process time-interval-based triggers
   * Generates tasks based on calendar intervals (e.g., every 6 months)
   */
  private async processTimeIntervalTrigger(
    vehiclePlan: VehiclePlan,
    plan: MaintenancePlan,
    checklistItems: PlanChecklistItem[],
    existingTasks: MaintenanceTask[]
  ): Promise<void> {
    const config = plan.cadenceConfig.time_interval;
    if (!config || !config.intervalDays) {
      logger.warn('No time_interval config for plan', { planId: plan.id }, 'triggerProcessor');
      return;
    }

    const intervalDays = config.intervalDays;
    const startDate = config.startDate 
      ? parseISO(config.startDate) 
      : parseISO(vehiclePlan.activationDate);
    
    const now = new Date();
    
    // Calculate next due date
    let nextDueDate = new Date(startDate);
    while (isBefore(nextDueDate, now)) {
      nextDueDate = addDays(nextDueDate, intervalDays);
    }

    // Look ahead window (create tasks up to 30 days in advance)
    const lookAheadDate = addDays(now, 30);
    
    if (isBefore(nextDueDate, lookAheadDate)) {
      for (const item of checklistItems) {
        // Check if task already exists for this interval
        const taskExists = existingTasks.some(task => 
          task.checklistItemId === item.id &&
          task.status !== "completed" &&
          task.status !== "dismissed" &&
          Math.abs(task.dueAt.getTime() - nextDueDate.getTime()) < 86400000 // Within 1 day
        );

        if (!taskExists) {
          const dueDate = addDays(nextDueDate, item.defaultDueOffset.days || 0);

          await this.createTask(vehiclePlan.id, item, dueDate, {
            triggerType: "time_interval",
            intervalDays,
            scheduledDate: format(nextDueDate, "yyyy-MM-dd"),
          });
        }
      }
    }
  }

  /**
   * Process odometer-based triggers
   * Generates tasks based on mileage intervals
   */
  private async processOdometerTrigger(
    vehiclePlan: VehiclePlan,
    plan: MaintenancePlan,
    checklistItems: PlanChecklistItem[],
    existingTasks: MaintenanceTask[]
  ): Promise<void> {
    const config = plan.cadenceConfig.odometer;
    if (!config || !config.intervalKm) {
      logger.warn('No odometer config for plan', { planId: plan.id }, 'triggerProcessor');
      return;
    }

    const intervalKm = config.intervalKm;
    const startKm = config.startOdometer || vehiclePlan.odometerAtActivation || 0;

    // Get current odometer reading from most recent maintenance log
    const vehicle = await this.storage.getVehicle(vehiclePlan.vehicleId);
    if (!vehicle) return;

    const logs = await this.storage.getMaintenanceLogs(vehicle.id);
    const latestLog = logs
      .filter((log: any) => log.odometerKm !== null)
      .sort((a: any, b: any) => b.date.localeCompare(a.date))[0];

    const currentKm = latestLog?.odometerKm || startKm;

    // Calculate next service interval
    const kmSinceStart = currentKm - startKm;
    const nextServiceKm = Math.ceil(kmSinceStart / intervalKm) * intervalKm + startKm;

    // Create tasks if we're within 500km of next service
    if (currentKm >= nextServiceKm - 500) {
      for (const item of checklistItems) {
        // Check if task already exists for this odometer interval
        const taskExists = existingTasks.some(task => 
          task.checklistItemId === item.id &&
          task.status !== "completed" &&
          task.status !== "dismissed" &&
          task.triggerContext?.serviceKm === nextServiceKm
        );

        if (!taskExists) {
          // Due date is "now" since it's based on current mileage
          const dueDate = addDays(new Date(), item.defaultDueOffset.days || 0);

          await this.createTask(vehiclePlan.id, item, dueDate, {
            triggerType: "odometer",
            intervalKm,
            currentKm,
            serviceKm: nextServiceKm,
          });
        }
      }
    }
  }

  /**
   * Process engine hours-based triggers
   * Generates tasks based on engine hour intervals
   */
  private async processEngineHoursTrigger(
    vehiclePlan: VehiclePlan,
    plan: MaintenancePlan,
    checklistItems: PlanChecklistItem[],
    existingTasks: MaintenanceTask[]
  ): Promise<void> {
    const config = plan.cadenceConfig.engine_hours;
    if (!config || !config.intervalHours) {
      logger.warn('No engine_hours config for plan', { planId: plan.id }, 'triggerProcessor');
      return;
    }

    const intervalHours = config.intervalHours;
    const startHours = config.startHours || vehiclePlan.engineHoursAtActivation || 0;

    // Get current engine hours from vehicle metadata
    // Note: This would need to be tracked somewhere - possibly in vehicle metadata
    // For now, we'll skip this if no engine hours are tracked
    const currentHours = vehiclePlan.metadata?.currentEngineHours || startHours;

    // Calculate next service interval
    const hoursSinceStart = currentHours - startHours;
    const nextServiceHours = Math.ceil(hoursSinceStart / intervalHours) * intervalHours + startHours;

    // Create tasks if we're within 5 hours of next service
    if (currentHours >= nextServiceHours - 5) {
      for (const item of checklistItems) {
        // Check if task already exists for this engine hours interval
        const taskExists = existingTasks.some(task => 
          task.checklistItemId === item.id &&
          task.status !== "completed" &&
          task.status !== "dismissed" &&
          task.triggerContext?.serviceHours === nextServiceHours
        );

        if (!taskExists) {
          // Due date is "now" since it's based on current hours
          const dueDate = addDays(new Date(), item.defaultDueOffset.days || 0);

          await this.createTask(vehiclePlan.id, item, dueDate, {
            triggerType: "engine_hours",
            intervalHours,
            currentHours,
            serviceHours: nextServiceHours,
          });
        }
      }
    }
  }

  /**
   * Create a maintenance task
   */
  private async createTask(
    vehiclePlanId: string,
    checklistItem: PlanChecklistItem,
    dueAt: Date,
    triggerContext: any
  ): Promise<void> {
    const task = {
      vehiclePlanId,
      checklistItemId: checklistItem.id,
      notes: checklistItem.description,
      dueAt,
      status: "pending" as const,
      triggerContext,
    };

    await this.storage.createMaintenanceTask(task);
    logger.debug('Created maintenance task', {
      checklistItemTitle: checklistItem.title,
      vehiclePlanId,
      checklistItemId: checklistItem.id,
    }, 'triggerProcessor');
  }

  /**
   * Update task statuses (pending → due)
   * Tasks become "due" when their due date passes
   */
  async updateTaskStatuses(): Promise<void> {
    logger.info('Updating task statuses', {}, 'triggerProcessor');
    
    const allTasksResult = await this.storage.getMaintenanceTasks({ status: "pending", limit: 10000 });
    const now = new Date();

    for (const task of allTasksResult.items) {
      if (task.status === "pending" && isBefore(task.dueAt, now)) {
        await this.storage.updateMaintenanceTask(task.id, { status: "due" });
        logger.debug('Task is now due', { taskId: task.id }, 'triggerProcessor');
      }
    }

    logger.info('Task status update complete', {}, 'triggerProcessor');
  }
}
