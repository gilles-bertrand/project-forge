export interface TimeTrackingPort {
  sumHoursByUserAndSprint(userId: string, sprintId: string): Promise<number>;
  deleteByProjectId(projectId: string): Promise<void>;
}
