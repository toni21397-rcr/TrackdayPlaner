import { DriveStep } from 'driver.js';

export type TutorialId = 'booking' | 'maintenance-plans' | 'maintenance-tasks';

export interface TutorialConfig {
  id: TutorialId;
  title: string;
  description: string;
  steps: DriveStep[];
}

export const tutorials: Record<TutorialId, TutorialConfig> = {
  booking: {
    id: 'booking',
    title: 'Booking Trackdays',
    description: 'Learn how to find and book trackdays with organizers',
    steps: [
      {
        popover: {
          title: 'Welcome to Trackday Booking',
          description: 'This quick tour will show you how to find and book trackdays with your favorite organizers.',
          side: 'bottom',
        },
      },
      {
        element: '[data-testid^="card-booking-"]',
        popover: {
          title: 'Organizer Cards',
          description: 'Browse available track organizers here. Each card shows contact information and available events.',
          side: 'top',
        },
      },
      {
        element: '[data-testid^="button-book-detail-"]',
        popover: {
          title: 'View Trackdays',
          description: 'Click here to see all available trackdays from this organizer, including dates, tracks, and pricing.',
          side: 'top',
        },
      },
      {
        popover: {
          title: 'Ready to Book',
          description: 'You can now browse organizers and view their trackday schedules. Click any organizer card to get started!',
          side: 'bottom',
        },
      },
    ],
  },

  'maintenance-plans': {
    id: 'maintenance-plans',
    title: 'Maintenance Plans',
    description: 'Learn how to create and manage vehicle maintenance plans',
    steps: [
      {
        popover: {
          title: 'Welcome to Maintenance Planning',
          description: 'Stay on top of your vehicle maintenance with automated task generation based on trackdays, mileage, or time intervals.',
          side: 'bottom',
        },
      },
      {
        element: '[data-testid="button-create-plan"]',
        popover: {
          title: 'Create a Maintenance Plan',
          description: 'Click here to create a new maintenance plan. Define what maintenance items are needed and when they should be performed.',
          side: 'left',
        },
      },
      {
        element: '.maintenance-plan-card:first-of-type',
        popover: {
          title: 'Your Maintenance Plans',
          description: 'Each plan contains a checklist of maintenance items. Plans can be assigned to vehicles and will automatically generate tasks.',
          side: 'top',
        },
      },
      {
        element: '[data-testid^="button-edit-plan-"]',
        popover: {
          title: 'Manage Plans',
          description: 'Edit or delete plans at any time. Changes to plans will affect all vehicles using that plan.',
          side: 'left',
        },
      },
      {
        popover: {
          title: 'All Set',
          description: 'Create plans, assign them to vehicles, and let the system generate maintenance tasks automatically. Check the Maintenance Tasks page to see upcoming work!',
          side: 'bottom',
        },
      },
    ],
  },

  'maintenance-tasks': {
    id: 'maintenance-tasks',
    title: 'Maintenance Tasks',
    description: 'Learn how to manage and complete maintenance tasks',
    steps: [
      {
        popover: {
          title: 'Welcome to Maintenance Tasks',
          description: 'View and manage all maintenance tasks generated from your vehicle plans.',
          side: 'bottom',
        },
      },
      {
        element: '[data-testid="button-generate-tasks"]',
        popover: {
          title: 'Generate Tasks',
          description: 'Click here to generate new tasks based on your trackdays, mileage, and time-based triggers.',
          side: 'left',
        },
      },
      {
        element: '[data-testid="select-status-filter"]',
        popover: {
          title: 'Filter Tasks',
          description: 'Filter tasks by status (pending, due, completed) or by vehicle to focus on what matters.',
          side: 'bottom',
        },
      },
      {
        element: '[data-testid^="button-complete-task-"]',
        popover: {
          title: 'Complete Tasks',
          description: 'Mark tasks as complete when maintenance is done. You can also snooze or dismiss tasks as needed.',
          side: 'left',
        },
      },
      {
        popover: {
          title: 'Stay on Track',
          description: 'Regular maintenance keeps your vehicle performing at its best. Check back here before each trackday!',
          side: 'bottom',
        },
      },
    ],
  },
};
