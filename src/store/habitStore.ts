import { create } from 'zustand';
import { format } from 'date-fns';
import notifee, { TriggerType, RepeatFrequency, AndroidImportance } from '@notifee/react-native';
import { Habit, HabitLog } from '../models/Habit';
import { HabitRepository } from '../storage/repositories/HabitRepository';
import { generateId } from '../utils/generateId';

const HABIT_CHANNEL_ID = 'habit-reminders';

async function ensureHabitChannel(): Promise<void> {
  await notifee.createChannel({
    id: HABIT_CHANNEL_ID,
    name: 'Habit Reminders',
    importance: AndroidImportance.HIGH,
  });
}

async function scheduleHabitReminder(habit: Habit): Promise<void> {
  if (!habit.reminderTime) return;
  try {
    await ensureHabitChannel();
    const [hours, minutes] = habit.reminderTime.split(':').map(Number);
    const trigger = new Date();
    trigger.setHours(hours, minutes, 0, 0);
    if (trigger.getTime() <= Date.now()) {
      trigger.setDate(trigger.getDate() + 1);
    }
    await notifee.createTriggerNotification(
      {
        id: `habit-${habit.id}`,
        title: habit.title,
        body: "Time for your daily habit! Don't break the streak 🔥",
        ios: { sound: 'default' },
        android: { channelId: HABIT_CHANNEL_ID, pressAction: { id: 'default' } },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: trigger.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
      }
    );
  } catch {
    // Notifications not critical — fail silently
  }
}

async function cancelHabitReminder(habitId: string): Promise<void> {
  try {
    await notifee.cancelNotification(`habit-${habitId}`);
  } catch {}
}

interface HabitState {
  habits: Habit[];
  todayLogs: HabitLog[];
  loading: boolean;

  loadHabits: (userId: string) => Promise<void>;
  loadTodayLogs: (userId: string) => Promise<void>;
  addHabit: (data: Omit<Habit, 'id' | 'createdAt' | 'archivedAt'>) => Promise<Habit>;
  updateHabit: (id: string, data: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleToday: (habitId: string, userId: string) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayLogs: [],
  loading: false,

  loadHabits: async (userId) => {
    set({ loading: true });
    try {
      const habits = await HabitRepository.findByUser(userId);
      set({ habits, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadTodayLogs: async (userId) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const todayLogs = await HabitRepository.getLogsForDate(userId, today);
      set({ todayLogs });
    } catch {}
  },

  addHabit: async (data) => {
    const habit: Habit = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
      archivedAt: null,
    };
    await HabitRepository.insert(habit);
    await scheduleHabitReminder(habit);
    set(state => ({ habits: [habit, ...state.habits] }));
    return habit;
  },

  updateHabit: async (id, data) => {
    const existing = get().habits.find(h => h.id === id);
    if (!existing) return;
    const updated = { ...existing, ...data };
    await HabitRepository.update(updated);
    await cancelHabitReminder(id);
    await scheduleHabitReminder(updated);
    set(state => ({ habits: state.habits.map(h => h.id === id ? updated : h) }));
  },

  deleteHabit: async (id) => {
    await cancelHabitReminder(id);
    await HabitRepository.delete(id);
    set(state => ({
      habits: state.habits.filter(h => h.id !== id),
      todayLogs: state.todayLogs.filter(l => l.habitId !== id),
    }));
  },

  toggleToday: async (habitId, userId) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = get().todayLogs.find(l => l.habitId === habitId);
    if (existing) {
      await HabitRepository.removeLog(habitId, today);
      set(state => ({ todayLogs: state.todayLogs.filter(l => l.habitId !== habitId) }));
    } else {
      const log = await HabitRepository.logCompletion(habitId, userId, today);
      set(state => ({ todayLogs: [...state.todayLogs, log] }));
    }
  },
}));
