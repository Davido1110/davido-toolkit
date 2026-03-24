import { Timestamp } from 'firebase/firestore';

// Role mapping: admin = CMO, manager = Lead, user = Staff
export type UserRole = 'admin' | 'manager' | 'user';
export type AssigneeRole = 'cmo' | 'lead' | 'staff' | 'all';
export type SOPStatus = 'draft' | 'published';
export type StepType = 'sequential' | 'parallel' | 'decision';
export type LearningStatus = 'not_started' | 'in_progress' | 'completed';
export type ReportCadence = 'weekly' | 'monthly';
export type ReportStatus = 'draft' | 'submitted';

export interface SOPStep {
  id: string;
  order: number;
  title: string;
  description: string;
  assigneeRole: AssigneeRole;
  sla: string;
  type: StepType;
  exampleOutput?: string;
  notes?: string;
  parallelGroup?: string;
}

export interface SOP {
  id: string;
  title: string;
  description: string;
  category: string;
  team: string;
  status: SOPStatus;
  roles: AssigneeRole[];
  steps: SOPStep[];
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  tags: string[];
}

export interface LearningProgress {
  id: string;
  userId: string;
  userName: string;
  sopId: string;
  sopTitle: string;
  status: LearningStatus;
  currentStep: number;
  quizScore?: number;
  quizAttempts: number;
  approvedByLead: boolean;
  approvedByCMO: boolean;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sourceSOPs?: { id: string; title: string; stepTitle?: string }[];
}

export const ASSIGNEE_ROLE_LABELS: Record<AssigneeRole, string> = {
  cmo: 'CMO',
  lead: 'Team Lead',
  staff: 'Nhân viên',
  all: 'Tất cả',
};

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  sequential: 'Tuần tự',
  parallel: 'Song song',
  decision: 'Quyết định',
};

export const SOP_TEAMS = [
  'D2C team',
  'Media team',
  'Ecom team',
  'Livestream',
];

export const SOP_CATEGORIES = [
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'HR',
  'Product',
  'Content',
  'KOL/KOC',
  'Ecom',
  'Customer Service',
];
