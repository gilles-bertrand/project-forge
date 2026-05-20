import { ProjectEntity } from "#src/project/project.entity.js";
import { ProjectMemberEntity } from "#src/project/project-member.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { TaskAssigneeEntity } from "#src/task/task-assignee.entity.js";
import { CommentEntity } from "#src/task/comment.entity.js";
import { AttachmentEntity } from "#src/task/attachment.entity.js";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";

// Entities
export * from "#src/project/project.entity.js";
export * from "#src/project/project-member.entity.js";
export * from "#src/epic/epic.entity.js";
export * from "#src/user-story/user-story.entity.js";
export * from "#src/task/task.entity.js";
export * from "#src/task/task-assignee.entity.js";
export * from "#src/task/comment.entity.js";
export * from "#src/task/attachment.entity.js";
export * from "#src/task/history-entry.entity.js";
export * from "#src/sprint/sprint.entity.js";

// Types & infra
export * from "#src/types.js";
export * from "#src/context.js";
export * from "#src/init.js";
export * from "#src/utils/list-query.js";
export * from "#src/utils/task-numbering.js";

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

// Routes
export * from "#src/project/routes/list.route.js";
export * from "#src/project/routes/get.route.js";
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
export * from "#src/sprint/routes/relationships.routes.js";

export * from "#src/search/search.route.js";
export * from "#src/dashboard/dashboard.route.js";
export * from "#src/dashboard/time-tracking.port.js";

export const entities = [
  ProjectEntity,
  ProjectMemberEntity,
  EpicEntity,
  UserStoryEntity,
  TaskEntity,
  TaskAssigneeEntity,
  CommentEntity,
  AttachmentEntity,
  HistoryEntryEntity,
  SprintEntity,
];
