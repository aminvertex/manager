// Roles
export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CEO = 'CEO',
  EXPERT_L1 = 'EXPERT_L1',
  EXPERT_L2 = 'EXPERT_L2',
  EXPERT_L3 = 'EXPERT_L3',
  TECH_COMMITTEE_MEMBER = 'TECH_COMMITTEE_MEMBER',
  TECH_COMMITTEE_MANAGER = 'TECH_COMMITTEE_MANAGER',
  SALES_CONSULTANT = 'SALES_CONSULTANT',
  // legacy (kept for backward compat)
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
}

// Task Status
export enum TaskStatus {
  ASSIGNED = 'ASSIGNED',
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  NEED_REVISION = 'NEED_REVISION',
  RESUBMITTED = 'RESUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  DELAYED = 'DELAYED',
}

// Task Priority
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Checklist Answer
export enum ChecklistAnswer {
  YES = 'YES',
  NO = 'NO',
  NA = 'NA',
}

// Evaluation Action
export enum EvaluationAction {
  APPROVE = 'APPROVE',
  APPROVE_WITH_COMMENT = 'APPROVE_WITH_COMMENT',
  NEED_REVISION = 'NEED_REVISION',
  REJECT = 'REJECT',
}

// QC Result
export enum QCResult {
  APPROVED = 'APPROVED',
  APPROVED_WITH_COMMENT = 'APPROVED_WITH_COMMENT',
  NEED_REVISION = 'NEED_REVISION',
  REJECTED = 'REJECTED',
}

// Notification Type
export enum NotificationType {
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  DEADLINE_REMINDER = 'DEADLINE_REMINDER',
  TASK_DELAYED = 'TASK_DELAYED',
  NEED_REVISION = 'NEED_REVISION',
  SUPERVISOR_EVALUATION = 'SUPERVISOR_EVALUATION',
  TASK_APPROVED = 'TASK_APPROVED',
  TASK_REJECTED = 'TASK_REJECTED',
  CHECKLIST_REMINDER = 'CHECKLIST_REMINDER',
  WEEKLY_REVIEW_REMINDER = 'WEEKLY_REVIEW_REMINDER',
  MONTHLY_REVIEW_READY = 'MONTHLY_REVIEW_READY',
  TRAINING_ASSIGNED = 'TRAINING_ASSIGNED',
}

// Collaboration Type
export enum CollaborationType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
}

// Skill Level
export enum SkillLevel {
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  EXPERT = 'EXPERT',
}

// Project Status
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
}

// Critical Incident Severity
export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: ApiError[];
  meta?: PaginationMeta;
}

export interface ApiError {
  field?: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

// Auth Types
export interface LoginRequest {
  mobile: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  mobile: string;
  roles: RoleCode[];
  mustChangePassword: boolean;
  employeeProfile?: EmployeeProfileSummary;
}

export interface EmployeeProfileSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  position?: string;
  avatarUrl?: string;
  email?: string;
  age?: number | null;
  skillLevel?: string;
  collaborationType?: string;
  collaborationStatus?: string;
  startDate?: string | null;
  supervisor?: { id: string; firstName: string; lastName: string } | null;
  primaryProject?: { id: string; name: string; code?: string } | null;
}

// KPI Types
export interface KPIComponentScores {
  onTimeDelivery: number;
  scientificQuality: number;
  accuracy: number;
  documentation: number;
  productivity: number;
  processCompliance: number;
  learning: number;
  teamwork: number;
  responsibility: number;
}

export interface KPIWeights {
  onTimeDelivery: number;
  scientificQuality: number;
  accuracy: number;
  documentation: number;
  productivity: number;
  processCompliance: number;
  learning: number;
  teamwork: number;
  responsibility: number;
}

export interface KPIResult {
  weightedScore: number;
  finalScore: number;
  classification: string;
  components: KPIComponentScores;
}

// Performance Classification
export interface PerformanceClassification {
  minScore: number;
  maxScore: number;
  label: string;
  color: 'green' | 'yellow' | 'red';
}
