/**
 * API型定義 - swagger.yamlに基づく
 */

// Error
export interface ApiError {
  error: string;
  detail?: string;
}

// Authentication
export interface LoginRequest {
  username: string;
  password: string;
  service?: string;
}

export interface LoginResponse {
  success: boolean;
  username?: string;
  userId?: number;
  message?: string;
}

export interface UserInfo {
  userid: number;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
  userpictureurl?: string;
}

// Moodle Course
export interface Course {
  id: number;
  fullname: string;
  shortname: string;
  categoryid: number;
  summary?: string;
  startdate?: number;
  enddate?: number;
  visible?: boolean;
}

export interface CreateCourseRequest {
  fullname: string;
  shortname: string;
  categoryid: number;
  summary?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parent?: number;
  coursecount?: number;
}

export interface CourseContent {
  id: number;
  name: string;
  visible?: boolean;
  summary?: string;
  modules?: any[];
}

export interface CreateActivityRequest {
  modulename: string;
  name: string;
  section?: number;
  intro?: string;
}

// Badges
export interface Badge {
  id: number;
  name: string;
  description?: string;
  imageurl?: string;
}

export interface UserBadge {
  badgeid: number;
  userid: number;
  dateissued?: number;
  uniquehash?: string;
}

// WebCoach Profile
export interface ProfileUpdate {
  nick_name?: string | null;
  self_intro?: string | null;
  target_job?: string | null;
  ideal_work_style?: string | null;
  badge_count?: number | null;
  goal?: string | null;
}

export interface Profile {
  mdl_user_id: number;
  nick_name?: string | null;
  self_intro?: string | null;
  target_job?: string | null;
  ideal_work_style?: string | null;
  monthly_goal?: string | null;
  badge_count?: number | null;
  goal?: string | null;
}

// WebCoach ResumeCourse
export interface ResumeCourse {
  courseid: number;
  fullname?: string;
  shortname?: string;
  summary?: string;
  progress?: number;
  lastaccess?: number;
  accesscount?: number;
}

export interface UpdateResumeCourseRequest {
  courseid: number;
  progress_percent: number;
}

// WebCoach Roadmap
export interface Roadmap {
  id: number;
  title?: string;
  category?: string;
  difficulty?: string;
  description?: string;
}

export interface RoadmapQueryParams {
  category?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}

// WebCoach AI
export interface AIRequest {
  message: string;
  user_id?: number;
  course_id?: number;
  context?: Record<string, any>;
  max_chunks?: number;
  use_tools?: boolean;
}

export interface AISource {
  chunk_index?: number;
  module_name?: string;
  filename?: string;
  section_name?: string;
  similarity?: number;
}

export interface AIToolCall {
  tool_name?: string;
  success?: boolean;
  result?: Record<string, any>;
  error?: string;
}

export interface AIResponse {
  success: boolean;
  message?: string;
  sources?: AISource[];
  tool_calls?: AIToolCall[];
  context?: Record<string, any>;
  timestamp?: string;
  suggestions?: string[];
}

// WebCoach Database
export interface UpdateDBRequest {
  data_type: string;
  records: Record<string, any>[];
}

export interface UpdateDBResponse {
  recordsProcessed: number;
}

// Health
export interface HealthResponse {
  status: string;
  timestamp?: string;
  service?: string;
  environment?: string;
}
