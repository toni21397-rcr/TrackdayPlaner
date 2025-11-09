import type { IStorage } from "./storage.ts";
import type { EmailService } from "./emailService.ts";
import type { MaintenanceTask, VehiclePlan, PlanChecklistItem } from "@shared/schema";
import { isBefore, addDays, differenceInHours } from "date-fns";

/**
 * NotificationCoordinator - Service to coordinate email notifications for maintenance tasks
 * 
 * Responsibilities:
 * - Send one-time due notifications for tasks
 * - Respect user notification preferences
 * - Track notification sending to avoid duplicates
 * - Generate action links for quick task management
 */
export class NotificationCoordinator {
  constructor(
    private storage: IStorage,
    private emailService: EmailService
  ) {}

  /**
   * Main entry point - send notifications for all due tasks
   */
  async sendDueTaskNotifications(): Promise<void> {
    console.log("[NotificationCoordinator] Checking for tasks needing notifications...");
    
    // Get all due tasks that haven't been notified yet
    const tasksResult = await this.storage.getMaintenanceTasks({ status: "due", limit: 10000 });
    const tasksToNotify = tasksResult.items.filter(task => 
      !task.lastNotificationAt && // Never notified
      isBefore(task.dueAt, addDays(new Date(), 7)) // Due within 7 days
    );

    console.log(`[NotificationCoordinator] Found ${tasksToNotify.length} tasks needing notifications`);

    // Group tasks by vehicle/user for consolidated emails
    const tasksByUser = await this.groupTasksByUser(tasksToNotify);

    for (const [userId, userTasks] of Object.entries(tasksByUser)) {
      try {
        await this.sendUserNotification(userId, userTasks);
      } catch (error) {
        console.error(`[NotificationCoordinator] Error sending notification to user ${userId}:`, error);
      }
    }

    console.log("[NotificationCoordinator] Notification sending complete");
  }

  /**
   * Group tasks by user for consolidated email notifications
   */
  private async groupTasksByUser(tasks: MaintenanceTask[]): Promise<Record<string, MaintenanceTask[]>> {
    const tasksByUser: Record<string, MaintenanceTask[]> = {};

    for (const task of tasks) {
      const vehiclePlan = await this.storage.getVehiclePlan(task.vehiclePlanId);
      if (!vehiclePlan) continue;

      const vehicle = await this.storage.getVehicle(vehiclePlan.vehicleId);
      if (!vehicle) continue;

      const userId = vehicle.userId;
      if (!tasksByUser[userId]) {
        tasksByUser[userId] = [];
      }
      tasksByUser[userId].push(task);
    }

    return tasksByUser;
  }

  /**
   * Send notification to a single user for all their due tasks
   */
  private async sendUserNotification(userId: string, tasks: MaintenanceTask[]): Promise<void> {
    // Check user notification preferences
    const prefs = await this.storage.getNotificationPreferences(userId);
    if (prefs && !prefs.emailEnabled) {
      console.log(`[NotificationCoordinator] User ${userId} has email notifications disabled`);
      return;
    }

    // Get user email
    const user = await this.storage.getUser(userId);
    if (!user || !user.email) {
      console.error(`[NotificationCoordinator] User ${userId} not found or has no email`);
      return;
    }

    // Build email content with task details
    const taskDetails = await this.buildTaskDetails(tasks);

    const subject = tasks.length === 1 
      ? "Maintenance Task Due Soon"
      : `${tasks.length} Maintenance Tasks Due Soon`;

    const htmlBody = this.buildEmailHTML(taskDetails);
    const textBody = this.buildEmailText(taskDetails);

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject,
        text: textBody,
        html: htmlBody,
      });

      // Mark tasks as notified
      for (const task of tasks) {
        await this.storage.updateMaintenanceTask(task.id, {
          lastNotificationAt: new Date(),
        });
      }

      console.log(`[NotificationCoordinator] Sent notification to ${user.email} for ${tasks.length} task(s)`);
    } catch (error) {
      console.error(`[NotificationCoordinator] Failed to send email to ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Build detailed task information for email
   */
  private async buildTaskDetails(tasks: MaintenanceTask[]): Promise<Array<{
    task: MaintenanceTask;
    vehicleName: string;
    planName: string;
    checklistItemTitle: string;
    actionLinks: {
      complete: string;
      snooze: string;
      dismiss: string;
      view: string;
    };
  }>> {
    const details = [];

    for (const task of tasks) {
      const vehiclePlan = await this.storage.getVehiclePlan(task.vehiclePlanId);
      if (!vehiclePlan) continue;

      const vehicle = await this.storage.getVehicle(vehiclePlan.vehicleId);
      const plan = await this.storage.getMaintenancePlan(vehiclePlan.planId);
      
      let checklistItem = null;
      if (task.checklistItemId && plan) {
        const items = await this.storage.getPlanChecklistItems(plan.id);
        checklistItem = items.find(item => item.id === task.checklistItemId);
      }

      if (!vehicle || !plan) continue;

      // Generate HMAC-signed action links
      const completeToken = this.emailService.generateActionToken(
        vehicle.userId,
        task.id,
        "complete"
      );

      const snoozeToken = this.emailService.generateActionToken(
        vehicle.userId,
        task.id,
        "snooze"
      );

      const baseUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPLIT_DEPLOYMENT ? 'replit.app' : 'repl.co'}`
        : 'http://localhost:5000';

      const dismissToken = this.emailService.generateActionToken(
        vehicle.userId,
        task.id,
        "dismiss"
      );

      details.push({
        task,
        vehicleName: vehicle.name,
        planName: plan.name,
        checklistItemTitle: checklistItem?.title || task.customTitle || "Untitled Task",
        actionLinks: {
          complete: `${baseUrl}/api/maintenance/email-action/${completeToken}`,
          snooze: `${baseUrl}/api/maintenance/email-action/${snoozeToken}`,
          dismiss: `${baseUrl}/api/maintenance/email-action/${dismissToken}`,
          view: `${baseUrl}/maintenance`,
        },
      });
    }

    return details;
  }

  /**
   * Build HTML email body
   */
  private buildEmailHTML(taskDetails: Array<any>): string {
    const taskRows = taskDetails.map(detail => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 16px 8px;">
          <strong>${detail.checklistItemTitle}</strong><br/>
          <small style="color: #6b7280;">
            ${detail.vehicleName} - ${detail.planName}<br/>
            Due: ${detail.task.dueAt.toLocaleDateString()}
          </small>
        </td>
        <td style="padding: 16px 8px; text-align: right;">
          <a href="${detail.actionLinks.complete}" 
             style="display: inline-block; padding: 8px 16px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; margin-right: 4px;">
            Complete
          </a>
          <a href="${detail.actionLinks.snooze}" 
             style="display: inline-block; padding: 8px 16px; background: #6b7280; color: white; text-decoration: none; border-radius: 4px; margin-right: 4px;">
            Snooze
          </a>
          <a href="${detail.actionLinks.dismiss}" 
             style="display: inline-block; padding: 8px 16px; background: #dc2626; color: white; text-decoration: none; border-radius: 4px;">
            Dismiss
          </a>
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f9fafb; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #111827;">
            Maintenance Tasks Due Soon
          </h1>
          <p style="margin: 0; color: #6b7280;">
            You have ${taskDetails.length} maintenance task${taskDetails.length > 1 ? 's' : ''} due soon for your vehicles.
          </p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
          ${taskRows}
        </table>
        
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p>View all your maintenance tasks in the <a href="${taskDetails[0]?.actionLinks.view}" style="color: #2563eb;">Trackday Planner app</a>.</p>
          <p style="margin-top: 16px;">You're receiving this email because you have maintenance tasks due. You can manage your notification preferences in your account settings.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build plain text email body
   */
  private buildEmailText(taskDetails: Array<any>): string {
    const taskList = taskDetails.map(detail => 
      `- ${detail.checklistItemTitle} (${detail.vehicleName} - ${detail.planName})\n` +
      `  Due: ${detail.task.dueAt.toLocaleDateString()}\n` +
      `  Complete: ${detail.actionLinks.complete}\n` +
      `  Snooze: ${detail.actionLinks.snooze}\n` +
      `  Dismiss: ${detail.actionLinks.dismiss}\n`
    ).join('\n');

    return `
Maintenance Tasks Due Soon

You have ${taskDetails.length} maintenance task${taskDetails.length > 1 ? 's' : ''} due soon for your vehicles:

${taskList}

View all tasks: ${taskDetails[0]?.actionLinks.view}

You're receiving this email because you have maintenance tasks due. You can manage your notification preferences in your account settings.
    `.trim();
  }

  /**
   * Send reminder notifications for overdue tasks
   * (Optional - could be called periodically)
   */
  async sendOverdueReminders(): Promise<void> {
    console.log("[NotificationCoordinator] Checking for overdue tasks...");
    
    const tasksResult = await this.storage.getMaintenanceTasks({ status: "due", limit: 10000 });
    const overdueTasks = tasksResult.items.filter(task => {
      if (!task.lastNotificationAt) return false;
      
      // Send reminder if task is overdue and last notification was > 3 days ago
      const isOverdue = isBefore(task.dueAt, new Date());
      const lastNotifiedHoursAgo = differenceInHours(new Date(), task.lastNotificationAt);
      
      return isOverdue && lastNotifiedHoursAgo > 72;
    });

    console.log(`[NotificationCoordinator] Found ${overdueTasks.length} overdue tasks needing reminders`);

    const tasksByUser = await this.groupTasksByUser(overdueTasks);

    for (const [userId, userTasks] of Object.entries(tasksByUser)) {
      try {
        await this.sendUserNotification(userId, userTasks);
      } catch (error) {
        console.error(`[NotificationCoordinator] Error sending reminder to user ${userId}:`, error);
      }
    }

    console.log("[NotificationCoordinator] Reminder sending complete");
  }
}
