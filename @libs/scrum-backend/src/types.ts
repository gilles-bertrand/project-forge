import { z } from "zod";

// Project
export const PROJECT_STATUSES = [
  "planned",
  "active",
  "paused",
  "completed",
  "cancelled",
  "archived",
] as const;
export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const PROJECT_MEMBER_ROLES = ["owner", "member"] as const;
export const ProjectMemberRoleSchema = z.enum(PROJECT_MEMBER_ROLES);
export type ProjectMemberRole = z.infer<typeof ProjectMemberRoleSchema>;

// Epic
export const EPIC_STATUSES = ["todo", "in-progress", "done"] as const;
export const EpicStatusSchema = z.enum(EPIC_STATUSES);
export type EpicStatus = z.infer<typeof EpicStatusSchema>;

// User Story
export const STORY_STATUSES = ["todo", "in-progress", "done"] as const;
export const StoryStatusSchema = z.enum(STORY_STATUSES);
export type StoryStatus = z.infer<typeof StoryStatusSchema>;

export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;
export const StoryPointsSchema = z
  .number()
  .int()
  .refine((v) => (STORY_POINTS as readonly number[]).includes(v));

// Task
export const TASK_STATUSES = ["todo", "in-progress", "testing", "uat", "done"] as const;
export const TaskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TASK_TYPES = [
  "Frontend",
  "Backend",
  "Database",
  "UX",
  "Analyse",
  "DevOps",
  "API",
  "Security",
  "Testing",
] as const;
export const TaskTypeSchema = z.enum(TASK_TYPES);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const TASK_NATURES = [
  "Bug",
  "Feature",
  "Maintenance",
  "Hotfix",
  "Refacto",
  "Techdebt",
  "Spike",
  "Review",
  "Deployment",
  "Infra",
] as const;
export const TaskNatureSchema = z.enum(TASK_NATURES);
export type TaskNature = z.infer<typeof TaskNatureSchema>;

export const TASK_PRIORITIES = ["Basse", "Moyenne", "Haute", "Critique"] as const;
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

// Comment
export const COMMENT_TYPES = [
  "comment",
  "status-change",
  "assignment",
  "github-push",
  "other",
] as const;
export const CommentTypeSchema = z.enum(COMMENT_TYPES);
export type CommentType = z.infer<typeof CommentTypeSchema>;

// Sprint
export const SPRINT_STATUSES = ["planned", "active", "completed"] as const;
export const SprintStatusSchema = z.enum(SPRINT_STATUSES);
export type SprintStatus = z.infer<typeof SprintStatusSchema>;

// Polymorphic satellite entities (Comment, Attachment, HistoryEntry)
export const SATELLITE_OWNER_TYPES = ["task", "story", "epic", "project"] as const;
export const SatelliteOwnerTypeSchema = z.enum(SATELLITE_OWNER_TYPES);
export type SatelliteOwnerType = z.infer<typeof SatelliteOwnerTypeSchema>;
