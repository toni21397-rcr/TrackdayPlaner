import { TaskStatus } from "@shared/schema";

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

export interface TaskTransition {
  from: TaskStatusType;
  to: TaskStatusType;
  isValid: boolean;
  reason?: string;
}

export class TaskLifecycleManager {
  private readonly validTransitions: Map<TaskStatusType, Set<TaskStatusType>>;

  constructor() {
    this.validTransitions = new Map<TaskStatusType, Set<TaskStatusType>>([
      [TaskStatus.PENDING as TaskStatusType, new Set<TaskStatusType>([TaskStatus.DUE, TaskStatus.SNOOZED, TaskStatus.COMPLETED, TaskStatus.DISMISSED])],
      [TaskStatus.DUE as TaskStatusType, new Set<TaskStatusType>([TaskStatus.SNOOZED, TaskStatus.COMPLETED, TaskStatus.DISMISSED])],
      [TaskStatus.SNOOZED as TaskStatusType, new Set<TaskStatusType>([TaskStatus.PENDING, TaskStatus.DUE, TaskStatus.COMPLETED, TaskStatus.DISMISSED])],
      [TaskStatus.COMPLETED as TaskStatusType, new Set<TaskStatusType>()],
      [TaskStatus.DISMISSED as TaskStatusType, new Set<TaskStatusType>()],
    ]);
  }

  canTransition(from: TaskStatusType, to: TaskStatusType): TaskTransition {
    if (from === to) {
      return {
        from,
        to,
        isValid: false,
        reason: "Task is already in this status",
      };
    }

    const allowedTransitions = this.validTransitions.get(from);
    if (!allowedTransitions) {
      return {
        from,
        to,
        isValid: false,
        reason: `Invalid source status: ${from}`,
      };
    }

    const isValid = allowedTransitions.has(to);
    return {
      from,
      to,
      isValid,
      reason: isValid ? undefined : `Cannot transition from ${from} to ${to}`,
    };
  }

  getNextStatus(currentStatus: TaskStatusType, action: "snooze" | "complete" | "dismiss" | "wake"): TaskStatusType | null {
    switch (action) {
      case "snooze":
        if (this.canTransition(currentStatus, TaskStatus.SNOOZED).isValid) {
          return TaskStatus.SNOOZED;
        }
        break;
      case "complete":
        if (this.canTransition(currentStatus, TaskStatus.COMPLETED).isValid) {
          return TaskStatus.COMPLETED;
        }
        break;
      case "dismiss":
        if (this.canTransition(currentStatus, TaskStatus.DISMISSED).isValid) {
          return TaskStatus.DISMISSED;
        }
        break;
      case "wake":
        if (currentStatus === TaskStatus.SNOOZED) {
          return TaskStatus.PENDING;
        }
        break;
    }
    return null;
  }

  shouldBeDue(task: {
    status: TaskStatusType;
    dueAt: Date;
    snoozedUntil: Date | null;
  }): boolean {
    const now = new Date();

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.DISMISSED) {
      return false;
    }

    if (task.status === TaskStatus.SNOOZED) {
      if (task.snoozedUntil && now >= task.snoozedUntil) {
        return now >= task.dueAt;
      }
      return false;
    }

    if (task.status === TaskStatus.PENDING) {
      return now >= task.dueAt;
    }

    if (task.status === TaskStatus.DUE) {
      return true;
    }

    return false;
  }

  getTasksNeedingStatusUpdate(tasks: Array<{
    id: string;
    status: TaskStatusType;
    dueAt: Date;
    snoozedUntil: Date | null;
  }>): Array<{
    id: string;
    currentStatus: TaskStatusType;
    suggestedStatus: TaskStatusType;
  }> {
    const updates: Array<{
      id: string;
      currentStatus: TaskStatusType;
      suggestedStatus: TaskStatusType;
    }> = [];

    for (const task of tasks) {
      const shouldBeDue = this.shouldBeDue(task);

      if (shouldBeDue && task.status !== TaskStatus.DUE) {
        if (this.canTransition(task.status, TaskStatus.DUE).isValid) {
          updates.push({
            id: task.id,
            currentStatus: task.status,
            suggestedStatus: TaskStatus.DUE,
          });
        }
      }

      if (task.status === TaskStatus.SNOOZED && task.snoozedUntil) {
        const now = new Date();
        if (now >= task.snoozedUntil && !shouldBeDue) {
          updates.push({
            id: task.id,
            currentStatus: task.status,
            suggestedStatus: TaskStatus.PENDING,
          });
        }
      }
    }

    return updates;
  }
}

export const taskLifecycle = new TaskLifecycleManager();
