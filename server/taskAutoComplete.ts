import type { MaintenanceTask, MaintenanceLog, PlanChecklistItem, AutoCompleteMatcher } from "@shared/schema";
import { autoCompleteMatcherSchema } from "@shared/schema";
import { logger } from "./logger";

export interface TaskMatchResult {
  taskId: string;
  matchScore: number;
  matchReasons: string[];
}

export class TaskAutoCompleteService {
  matchMaintenanceLogToTasks(
    log: MaintenanceLog,
    tasks: Array<MaintenanceTask & { checklistItem?: PlanChecklistItem | null }>,
  ): TaskMatchResult[] {
    const matches: TaskMatchResult[] = [];

    for (const task of tasks) {
      if (task.status !== "pending" && task.status !== "due") {
        continue;
      }

      if (task.completedAt || task.dismissedAt) {
        continue;
      }

      const matchResult = this.matchTaskToLog(task, log);
      if (matchResult.matchScore > 0) {
        matches.push({
          taskId: task.id,
          matchScore: matchResult.matchScore,
          matchReasons: matchResult.matchReasons,
        });
      }
    }

    matches.sort((a, b) => b.matchScore - a.matchScore);
    return matches;
  }

  private matchTaskToLog(
    task: MaintenanceTask & { checklistItem?: PlanChecklistItem | null },
    log: MaintenanceLog,
  ): { matchScore: number; matchReasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (!task.checklistItem) {
      if (task.customTitle && task.customTitle.toLowerCase().includes(log.type.toLowerCase())) {
        score += 30;
        reasons.push("Custom title matches maintenance type");
      }
      return { matchScore: score, matchReasons: reasons };
    }

    let matcher: AutoCompleteMatcher = {};
    try {
      const parsed = autoCompleteMatcherSchema.safeParse(task.checklistItem.autoCompleteMatcher);
      matcher = parsed.success ? parsed.data : {};
    } catch (e) {
      logger.warn('Invalid autoCompleteMatcher for checklist item', {
        checklistItemId: task.checklistItemId,
      }, 'taskAutoComplete');
      matcher = {};
    }
    
    if (matcher.maintenanceType && matcher.maintenanceType === log.type) {
      score += 50;
      reasons.push("Maintenance type exact match");
    } else if (task.checklistItem.maintenanceType === log.type) {
      score += 40;
      reasons.push("Checklist maintenance type matches");
    }

    if (log.odometerKm && matcher.odometerTolerance) {
      const taskOdometerHint = (task.triggerContext as any)?.targetOdometer;
      if (typeof taskOdometerHint === "number") {
        const diff = Math.abs(log.odometerKm - taskOdometerHint);
        if (diff <= matcher.odometerTolerance) {
          score += 30;
          reasons.push(`Odometer within tolerance (${diff}km)`);
        }
      }
    }

    const logNotesLower = log.notes.toLowerCase();
    if (matcher.partsRequired && matcher.partsRequired.length > 0) {
      const matchedParts = matcher.partsRequired.filter((part) =>
        logNotesLower.includes(part.toLowerCase()),
      );
      if (matchedParts.length > 0) {
        score += matchedParts.length * 10;
        reasons.push(`Parts mentioned: ${matchedParts.join(", ")}`);
      }
    }

    const titleWords = task.checklistItem.title.toLowerCase().split(/\s+/);
    const matchedWords = titleWords.filter(
      (word) => word.length > 3 && logNotesLower.includes(word),
    );
    if (matchedWords.length > 0) {
      score += matchedWords.length * 5;
      reasons.push(`Title keywords in notes: ${matchedWords.join(", ")}`);
    }

    const today = new Date();
    const dueDate = task.dueAt instanceof Date ? task.dueAt : new Date(task.dueAt);
    const daysSinceDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceDue >= -7 && daysSinceDue <= 30) {
      score += 20;
      reasons.push(`Task is near due date (${daysSinceDue} days ${daysSinceDue >= 0 ? "overdue" : "until due"})`);
    }

    return { matchScore: score, matchReasons: reasons };
  }

  suggestBestMatch(
    log: MaintenanceLog,
    tasks: Array<MaintenanceTask & { checklistItem?: PlanChecklistItem | null }>,
  ): {
    bestMatch: TaskMatchResult | null;
    allMatches: TaskMatchResult[];
    shouldAutoComplete: boolean;
  } {
    const allMatches = this.matchMaintenanceLogToTasks(log, tasks);
    const bestMatch = allMatches.length > 0 ? allMatches[0] : null;

    const shouldAutoComplete = bestMatch !== null && bestMatch.matchScore >= 60;

    return {
      bestMatch,
      allMatches,
      shouldAutoComplete,
    };
  }
}

export const taskAutoComplete = new TaskAutoCompleteService();
