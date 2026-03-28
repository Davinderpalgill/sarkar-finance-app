export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'closed';
  dueDate: number | null;       // unix timestamp ms
  completedAt: number | null;
  createdAt: number;
  voiceTranscript: string;      // original voice text for reference
  sourceLanguage: string;       // 'en-US' | 'hi-IN' | 'pa-IN'
}
