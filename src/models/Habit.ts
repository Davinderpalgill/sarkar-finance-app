export interface Habit {
  id: string;
  userId: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  reminderTime: string | null;  // 'HH:MM' 24-hour, null = no reminder
  createdAt: number;
  archivedAt: number | null;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string;        // 'YYYY-MM-DD'
  completedAt: number; // epoch ms
}

export const HABIT_COLORS = [
  '#8257E6', '#FF4757', '#F59E0B', '#4ADE80',
  '#0EA5E9', '#EC4899', '#14B8A6', '#F97316',
];

export const HABIT_ICONS: { name: string; label: string }[] = [
  { name: 'fitness-center',   label: 'Workout'  },
  { name: 'menu-book',        label: 'Read'     },
  { name: 'water-drop',       label: 'Hydrate'  },
  { name: 'bed',              label: 'Sleep'    },
  { name: 'directions-run',   label: 'Run'      },
  { name: 'restaurant',       label: 'Eat'      },
  { name: 'code',             label: 'Code'     },
  { name: 'music-note',       label: 'Music'    },
  { name: 'brush',            label: 'Create'   },
  { name: 'favorite',         label: 'Care'     },
  { name: 'self-improvement', label: 'Meditate' },
  { name: 'local-cafe',       label: 'Coffee'   },
];
