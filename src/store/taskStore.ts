import { create } from 'zustand';
import { Task } from '../models/Task';
import { TaskRepository, TaskStats } from '../storage/repositories/TaskRepository';
import { generateId } from '../utils/generateId';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  taskStats: TaskStats | null;
  statsLoading: boolean;

  loadTasks: (userId: string, status?: Task['status']) => Promise<void>;
  loadTasksInRange: (userId: string, fromMs: number, toMs: number, status?: Task['status']) => Promise<void>;
  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  closeTask: (id: string) => Promise<void>;
  loadStats: (userId: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly') => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  taskStats: null,
  statsLoading: false,

  loadTasks: async (userId, status) => {
    set({ loading: true });
    try {
      const tasks = await TaskRepository.findByUser(userId, status);
      set({ tasks, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadTasksInRange: async (userId, fromMs, toMs, status) => {
    set({ loading: true });
    try {
      const tasks = await TaskRepository.findByUserInRange(userId, fromMs, toMs, status);
      set({ tasks, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addTask: async (data) => {
    const now = Date.now();
    const task: Task = {
      ...data,
      id: generateId(),
      completedAt: null,
      createdAt: now,
    };
    await TaskRepository.insert(task);
    set(state => ({ tasks: [task, ...state.tasks] }));
    return task;
  },

  updateTask: async (id, data) => {
    const existing = get().tasks.find(t => t.id === id);
    if (!existing) return;
    const updated = { ...existing, ...data };
    await TaskRepository.update(updated);
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? updated : t),
    }));
  },

  deleteTask: async (id) => {
    await TaskRepository.delete(id);
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
    }));
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const now = Date.now();
    const isTerminal = task.status === 'completed' || task.status === 'closed';
    const updated: Task = {
      ...task,
      status: isTerminal ? 'pending' : 'completed',
      completedAt: isTerminal ? null : now,
    };
    await TaskRepository.update(updated);
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? updated : t),
    }));
  },

  closeTask: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const updated: Task = {
      ...task,
      status: 'closed',
      completedAt: null,
    };
    await TaskRepository.update(updated);
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? updated : t),
    }));
  },

  loadStats: async (userId, period) => {
    set({ statsLoading: true });
    try {
      const taskStats = await TaskRepository.getStats(userId, period);
      set({ taskStats, statsLoading: false });
    } catch {
      set({ statsLoading: false });
    }
  },
}));
