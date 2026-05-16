// ============================================
// JOB BOARD TYPES
// ============================================

export interface JobListing {
  id?: number;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  source: 'bayt' | 'naukri' | 'gulftalent' | 'upwork' | 'linkedin';
  postedDate: Date;
  jobLevel?: string;
  jobType?: string;
  skills?: string[];
  experienceYears?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JobFilter {
  id?: number;
  userId?: number;
  name?: string;
  keywords: string[];
  locations: string[];
  minSalary?: number;
  maxSalary?: number;
  jobLevel?: string;
  jobType?: string;
  experienceYears?: number;
  excludedKeywords?: string[];
  autoApply?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Application {
  id?: number;
  jobId: number;
  userId?: number;
  appliedAt?: Date;
  status: 'pending' | 'applied' | 'rejected' | 'accepted' | 'interview' | 'offer';
  coverLetter?: string;
  source: string;
  applicationUrl?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ApplicationStatusHistory {
  id?: number;
  applicationId: number;
  status: string;
  changedAt?: Date;
  notes?: string;
}

// ============================================
// CV TYPES
// ============================================

export interface CV {
  id?: number;
  userId?: number;
  filePath: string;
  fileName: string;
  skills: string[];
  experience: string;
  education: string;
  summary?: string;
  version?: number;
  isActive?: boolean;
  uploadedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CVData {
  skills: string[];
  experience: string;
  education: string;
  summary?: string;
  certifications?: string[];
  languages?: string[];
}

// ============================================
// JOB BOARD CREDENTIALS
// ============================================

export interface JobBoardCredential {
  id?: number;
  userId?: number;
  source: 'bayt' | 'naukri' | 'gulftalent' | 'upwork' | 'linkedin';
  email?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  isActive?: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================
// SEARCH HISTORY
// ============================================

export interface SearchHistory {
  id?: number;
  userId?: number;
  keywords: string[];
  locations: string[];
  source: string;
  resultsCount: number;
  createdAt?: Date;
}

// ============================================
// JOB ALERTS
// ============================================

export interface JobAlert {
  id?: number;
  userId?: number;
  jobId: number;
  alertType: 'new_job' | 'application_status' | 'recommendation';
  isRead?: boolean;
  createdAt?: Date;
}

// ============================================
// AGENT TYPES
// ============================================

export interface BaseAgentConfig {
  browser?: any;
  page?: any;
  headless?: boolean;
  timeout?: number;
}

export interface SearchOptions {
  keywords: string[];
  locations: string[];
  minSalary?: number;
  maxSalary?: number;
  jobLevel?: string;
  jobType?: string;
  experienceYears?: number;
}

export interface ApplyOptions {
  job: JobListing;
  cvPath: string;
  coverLetter?: string;
  autoFill?: boolean;
}

export interface AgentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface SearchJobsRequest {
  keywords: string[];
  locations: string[];
  minSalary?: number;
  maxSalary?: number;
  source?: string;
  limit?: number;
}

export interface SearchJobsResponse {
  success: boolean;
  jobs: JobListing[];
  total: number;
  timestamp: Date;
}

export interface ApplyJobRequest {
  jobId: number;
  source: string;
  cvId?: number;
  coverLetter?: string;
}

export interface ApplyJobResponse {
  success: boolean;
  applicationId?: number;
  status: string;
  message: string;
}

export interface GetApplicationsResponse {
  success: boolean;
  applications: Application[];
  total: number;
}

// ============================================
// USER TYPES
// ============================================

export interface User {
  id?: number;
  email: string;
  name?: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface UserProfile {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  headline?: string;
  bio?: string;
}

// ============================================
// ERROR TYPES
// ============================================

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

// ============================================
// PAGINATION TYPES
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// EMAIL TYPES
// ============================================

export interface EmailConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  notificationEmail: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ============================================
// DATABASE QUERY TYPES
// ============================================

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

// ============================================
// SCHEDULER TYPES
// ============================================

export interface ScheduledTask {
  name: string;
  cronExpression: string;
  handler: () => Promise<void>;
  enabled: boolean;
}

// ============================================
// LOGGER TYPES
// ============================================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
}
