import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager, EntityRepository } from "@mikro-orm/core";
import { literal, object, string } from "zod";
import type { ProjectEntityType } from "#src/project/project.entity.js";
import type { TimeTrackingPort } from "#src/dashboard/time-tracking.port.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { TaskAssigneeEntity } from "#src/task/task-assignee.entity.js";
import { CommentEntity } from "#src/task/comment.entity.js";
import { AttachmentEntity } from "#src/task/attachment.entity.js";
import { HistoryEntryEntity } from "#src/task/history-entry.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { ProjectMemberEntity } from "#src/project/project-member.entity.js";
import { ProjectTaskCounterEntity } from "#src/project/project-task-counter.entity.js";
import { SprintBurndownSnapshotEntity } from "#src/sprint/sprint-burndown-snapshot.entity.js";
import { AcceptanceTestEntity } from "#src/acceptance-test/acceptance-test.entity.js";
import { StoryDependencyEntity } from "#src/story-dependency/story-dependency.entity.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";

export class DeleteProjectRoute implements Route {
  public constructor(
    private repository: EntityRepository<ProjectEntityType>,
    private em: EntityManager,
    private timeTrackingPort: TimeTrackingPort,
  ) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.delete(
      "/:id",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            204: makeSingleJsonApiTopDocument(literal(null)),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const project = await this.repository.findOne({ id });

        if (!project) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "PROJECT_NOT_FOUND",
              detail: `Project with id ${id} not found`,
            }),
          );
        }

        await this.em.transactional(async (em) => {
          const tasks = await em.find(TaskEntity, { projectId: id }, { fields: ["id"] });
          const taskIds = tasks.map((t) => t.id);
          const stories = await em.find(UserStoryEntity, { projectId: id }, { fields: ["id"] });
          const storyIds = stories.map((s) => s.id);
          const epics = await em.find(EpicEntity, { projectId: id }, { fields: ["id"] });
          const epicIds = epics.map((e) => e.id);
          const sprints = await em.find(SprintEntity, { projectId: id }, { fields: ["id"] });
          const sprintIds = sprints.map((s) => s.id);

          if (taskIds.length > 0) {
            await em.nativeDelete(TaskAssigneeEntity, { taskId: { $in: taskIds } });
          }
          if (sprintIds.length > 0) {
            await em.nativeDelete(SprintBurndownSnapshotEntity, {
              sprintId: { $in: sprintIds },
            });
          }

          // Comments / Attachments / HistoryEntries — polymorphic cascade
          const ownerSiblings = [
            { ownerType: "project", ownerId: id },
            ...(taskIds.length > 0 ? [{ ownerType: "task", ownerId: { $in: taskIds } }] : []),
            ...(storyIds.length > 0 ? [{ ownerType: "story", ownerId: { $in: storyIds } }] : []),
            ...(epicIds.length > 0 ? [{ ownerType: "epic", ownerId: { $in: epicIds } }] : []),
          ];

          await em.nativeDelete(CommentEntity, { $or: ownerSiblings });
          await em.nativeDelete(AttachmentEntity, { $or: ownerSiblings });
          await em.nativeDelete(HistoryEntryEntity, { $or: ownerSiblings });

          if (storyIds.length > 0) {
            await em.nativeDelete(AcceptanceTestEntity, { userStoryId: { $in: storyIds } });
            await em.nativeDelete(StoryDependencyEntity, {
              $or: [{ fromStoryId: { $in: storyIds } }, { toStoryId: { $in: storyIds } }],
            });
          }

          await em.nativeDelete(TaskEntity, { projectId: id });
          await em.nativeDelete(UserStoryEntity, { projectId: id });
          await em.nativeDelete(EpicEntity, { projectId: id });
          await em.nativeDelete(SprintEntity, { projectId: id });
          await em.nativeDelete(ProjectMemberEntity, { projectId: id });
          await em.nativeDelete(ProjectTaskCounterEntity, { projectId: id });

          await this.timeTrackingPort.deleteByProjectId(id);

          em.remove(project);
        });

        return reply.code(204).send({ data: null });
      },
    );
  }
}
