import { ProjectEntity } from "#src/project/project.entity.js";
import { ProjectMemberEntity } from "#src/project/project-member.entity.js";
import { ProjectTaskCounterEntity } from "#src/project/project-task-counter.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { TaskAssigneeEntity } from "#src/task/task-assignee.entity.js";
import { CommentEntity } from "#src/task/comment.entity.js";
import { AttachmentEntity } from "#src/task/attachment.entity.js";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { SprintBurndownSnapshotEntity } from "#src/sprint/sprint-burndown-snapshot.entity.js";
import { AcceptanceTestEntity } from "#src/acceptance-test/acceptance-test.entity.js";
import { StoryDependencyEntity } from "#src/story-dependency/story-dependency.entity.js";

// Entities
export * from "#src/project/project.entity.js";
export * from "#src/project/project-member.entity.js";
export * from "#src/project/project-task-counter.entity.js";
export * from "#src/epic/epic.entity.js";
export * from "#src/user-story/user-story.entity.js";
export * from "#src/task/task.entity.js";
export * from "#src/task/task-assignee.entity.js";
export * from "#src/task/comment.entity.js";
export * from "#src/task/attachment.entity.js";
export * from "#src/task/history-entry.entity.js";
export * from "#src/sprint/sprint.entity.js";
export * from "#src/sprint/sprint-burndown-snapshot.entity.js";
export * from "#src/acceptance-test/acceptance-test.entity.js";
export * from "#src/story-dependency/story-dependency.entity.js";

// Types & infra
export * from "#src/types.js";
export * from "#src/context.js";
export * from "#src/init.js";
export * from "#src/audit/audit-context.js";
export * from "#src/audit/audit.subscriber.js";
export * from "#src/audit/audit.hook.js";
export * from "#src/utils/list-query.js";
export * from "#src/utils/task-numbering.js";
export * from "#src/sprint/utils/sprint-numbering.js";
export * from "#src/sprint/utils/create-sprint.js";

// Serializers
export * from "#src/project/project.serializer.js";
export * from "#src/project/project-member.serializer.js";
export * from "#src/epic/epic.serializer.js";
export * from "#src/user-story/user-story.serializer.js";
export * from "#src/task/task.serializer.js";
export * from "#src/task/comment.serializer.js";
export * from "#src/task/attachment.serializer.js";
export * from "#src/task/history-entry.serializer.js";
export * from "#src/task/task-assignee.serializer.js";
export * from "#src/sprint/sprint.serializer.js";
export * from "#src/sprint/sprint-burndown-snapshot.serializer.js";
export * from "#src/sprint/burndown.service.js";
export * from "#src/acceptance-test/acceptance-test.serializer.js";
export * from "#src/acceptance-test/aggregate.js";
export * from "#src/story-dependency/story-dependency.serializer.js";
export * from "#src/story-dependency/story-dependency.service.js";
export * from "#src/story-dependency/cycle-detection.js";

// Routes
export * from "#src/project/routes/list.route.js";
export * from "#src/project/routes/get.route.js";
export * from "#src/project/routes/stats.route.js";
export * from "#src/project/routes/create.route.js";
export * from "#src/project/routes/update.route.js";
export * from "#src/project/routes/delete.route.js";
export * from "#src/project/routes/members.routes.js";
export * from "#src/project/routes/relationships.routes.js";

export * from "#src/epic/routes/list.route.js";
export * from "#src/epic/routes/get.route.js";
export * from "#src/epic/routes/create.route.js";
export * from "#src/epic/routes/update.route.js";
export * from "#src/epic/routes/delete.route.js";
export * from "#src/epic/routes/relationships.routes.js";

export * from "#src/user-story/routes/list.route.js";
export * from "#src/user-story/routes/get.route.js";
export * from "#src/user-story/routes/create.route.js";
export * from "#src/user-story/routes/update.route.js";
export * from "#src/user-story/routes/delete.route.js";
export * from "#src/user-story/routes/relationships.routes.js";

export * from "#src/task/routes/list.route.js";
export * from "#src/task/routes/get.route.js";
export * from "#src/task/routes/create.route.js";
export * from "#src/task/routes/update.route.js";
export * from "#src/task/routes/delete.route.js";
export * from "#src/task/routes/comments.routes.js";
export * from "#src/task/routes/attachments.routes.js";
export * from "#src/task/routes/history.routes.js";
export * from "#src/task/routes/assignees.routes.js";

export * from "#src/sprint/routes/list.route.js";
export * from "#src/sprint/routes/get.route.js";
export * from "#src/sprint/routes/create.route.js";
export * from "#src/sprint/routes/update.route.js";
export * from "#src/sprint/routes/delete.route.js";
export * from "#src/sprint/routes/actions.routes.js";
export * from "#src/sprint/routes/close-preview.route.js";
export * from "#src/sprint/routes/stop-sprint.route.js";
export * from "#src/sprint/routes/items.routes.js";
export * from "#src/sprint/routes/relationships.routes.js";
export * from "#src/sprint/routes/burndown.route.js";
export * from "#src/sprint/utils/sprint-numbering.js";
export * from "#src/sprint/utils/create-sprint.js";

export * from "#src/acceptance-test/routes/list-by-story.route.js";
export * from "#src/acceptance-test/routes/create-on-story.route.js";
export * from "#src/acceptance-test/routes/update.route.js";
export * from "#src/acceptance-test/routes/delete.route.js";
export * from "#src/acceptance-test/routes/summary.route.js";
export * from "#src/story-dependency/routes/list-by-story.route.js";
export * from "#src/story-dependency/routes/create-on-story.route.js";
export * from "#src/story-dependency/routes/delete.route.js";

export * from "#src/search/search.route.js";
export * from "#src/dashboard/dashboard.route.js";
export * from "#src/dashboard/time-tracking.port.js";

export const entities = [
  ProjectEntity,
  ProjectMemberEntity,
  ProjectTaskCounterEntity,
  EpicEntity,
  UserStoryEntity,
  TaskEntity,
  TaskAssigneeEntity,
  CommentEntity,
  AttachmentEntity,
  HistoryEntryEntity,
  SprintEntity,
  SprintBurndownSnapshotEntity,
  AcceptanceTestEntity,
  StoryDependencyEntity,
];
