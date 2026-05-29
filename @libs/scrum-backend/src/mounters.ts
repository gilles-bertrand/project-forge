import type { EntityManager } from "@mikro-orm/core";
import type { SqlEntityManager } from "@mikro-orm/postgresql";
import type { Route } from "@libs/backend-shared";
import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { TimeTrackingPort } from "#src/dashboard/time-tracking.port.js";

import { ProjectEntity } from "#src/project/project.entity.js";
import { EpicEntity } from "#src/epic/epic.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { ListProjectsRoute } from "#src/project/routes/list.route.js";
import { GetProjectRoute } from "#src/project/routes/get.route.js";
import { CreateProjectRoute } from "#src/project/routes/create.route.js";
import { UpdateProjectRoute } from "#src/project/routes/update.route.js";
import { DeleteProjectRoute } from "#src/project/routes/delete.route.js";
import {
  AddProjectMemberRoute,
  ListProjectMembersRoute,
  RemoveProjectMemberRoute,
} from "#src/project/routes/members.routes.js";
import { GetProjectStatsRoute } from "#src/project/routes/stats.route.js";
import {
  ListProjectEpicsRoute,
  ListProjectSprintsRoute,
  ListProjectTasksRoute,
  ListProjectUserStoriesRoute,
} from "#src/project/routes/relationships.routes.js";
import { ListEpicsRoute } from "#src/epic/routes/list.route.js";
import { GetEpicRoute } from "#src/epic/routes/get.route.js";
import { CreateEpicRoute } from "#src/epic/routes/create.route.js";
import { UpdateEpicRoute } from "#src/epic/routes/update.route.js";
import { DeleteEpicRoute } from "#src/epic/routes/delete.route.js";
import {
  ListEpicTasksRoute,
  ListEpicUserStoriesRoute,
} from "#src/epic/routes/relationships.routes.js";
import { ListUserStoriesRoute } from "#src/user-story/routes/list.route.js";
import { GetUserStoryRoute } from "#src/user-story/routes/get.route.js";
import { CreateUserStoryRoute } from "#src/user-story/routes/create.route.js";
import { UpdateUserStoryRoute } from "#src/user-story/routes/update.route.js";
import { DeleteUserStoryRoute } from "#src/user-story/routes/delete.route.js";
import { ListUserStoryTasksRoute } from "#src/user-story/routes/relationships.routes.js";
import { ListTasksRoute } from "#src/task/routes/list.route.js";
import { GetTaskRoute } from "#src/task/routes/get.route.js";
import { CreateTaskRoute } from "#src/task/routes/create.route.js";
import { UpdateTaskRoute } from "#src/task/routes/update.route.js";
import { DeleteTaskRoute } from "#src/task/routes/delete.route.js";
import { AddTaskCommentRoute, ListTaskCommentsRoute } from "#src/task/routes/comments.routes.js";
import {
  AddTaskAttachmentRoute,
  ListTaskAttachmentsRoute,
  UploadTaskAttachmentRoute,
} from "#src/task/routes/attachments.routes.js";
import {
  DeleteCommentRoute,
  GetCommentRoute,
  UpdateCommentRoute,
} from "#src/task/routes/comments-flat.routes.js";
import {
  DeleteAttachmentRoute,
  GetAttachmentRoute,
} from "#src/task/routes/attachments-flat.routes.js";
import { ListHistoryByOwnerRoute, ListTaskHistoryRoute } from "#src/task/routes/history.routes.js";
import {
  AddTaskAssigneeRoute,
  ListTaskAssigneesRoute,
  RemoveTaskAssigneeRoute,
} from "#src/task/routes/assignees.routes.js";
import { ListSprintsRoute } from "#src/sprint/routes/list.route.js";
import { GetSprintRoute } from "#src/sprint/routes/get.route.js";
import { CreateSprintRoute } from "#src/sprint/routes/create.route.js";
import { UpdateSprintRoute } from "#src/sprint/routes/update.route.js";
import { DeleteSprintRoute } from "#src/sprint/routes/delete.route.js";
import { StartSprintRoute } from "#src/sprint/routes/actions.routes.js";
import { StopSprintRoute } from "#src/sprint/routes/stop-sprint.route.js";
import { CloseSprintPreviewRoute } from "#src/sprint/routes/close-preview.route.js";
import { AddSprintItemsRoute } from "#src/sprint/routes/items.routes.js";
import { ListSprintTasksRoute } from "#src/sprint/routes/relationships.routes.js";
import {
  CreateSprintBurndownSnapshotRoute,
  GetSprintBurndownRoute,
} from "#src/sprint/routes/burndown.route.js";
import { SearchRoute } from "#src/search/search.route.js";
import { DashboardRoute } from "#src/dashboard/dashboard.route.js";
import { satelliteRoutesFor } from "#src/satellite-routes.js";
import { AcceptanceTestEntity } from "#src/acceptance-test/acceptance-test.entity.js";
import { ListByStoryAcceptanceTestRoute } from "#src/acceptance-test/routes/list-by-story.route.js";
import { CreateOnStoryAcceptanceTestRoute } from "#src/acceptance-test/routes/create-on-story.route.js";
import { UpdateAcceptanceTestRoute } from "#src/acceptance-test/routes/update.route.js";
import { DeleteAcceptanceTestRoute } from "#src/acceptance-test/routes/delete.route.js";
import { AcceptanceTestSummaryByStoryRoute } from "#src/acceptance-test/routes/summary.route.js";
import { StoryDependencyEntity } from "#src/story-dependency/story-dependency.entity.js";
import { ListByStoryDependenciesRoute } from "#src/story-dependency/routes/list-by-story.route.js";
import { CreateOnStoryDependencyRoute } from "#src/story-dependency/routes/create-on-story.route.js";
import { DeleteStoryDependencyRoute } from "#src/story-dependency/routes/delete.route.js";

async function mountRoutes(
  parent: FastifyInstanceTypeForModule,
  prefix: string,
  routes: Route<FastifyInstanceTypeForModule>[],
): Promise<void> {
  await parent.register(
    async (f) => {
      for (const r of routes) r.routeDefinition(f);
    },
    { prefix },
  );
}

export async function mountProjects(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
  timeTrackingPort: TimeTrackingPort,
): Promise<void> {
  const repo = em.getRepository(ProjectEntity);
  await mountRoutes(parent, "/projects", [
    new ListProjectsRoute(em),
    new GetProjectRoute(repo),
    new CreateProjectRoute(repo),
    new UpdateProjectRoute(repo),
    new DeleteProjectRoute(repo, em, timeTrackingPort),
    new GetProjectStatsRoute(em),
    new ListProjectMembersRoute(em),
    new AddProjectMemberRoute(em),
    new RemoveProjectMemberRoute(em),
    new ListProjectTasksRoute(em),
    new ListProjectSprintsRoute(em),
    new ListProjectEpicsRoute(em),
    new ListProjectUserStoriesRoute(em),
    ...satelliteRoutesFor(em, "project"),
  ]);
}

export async function mountEpics(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
): Promise<void> {
  const repo = em.getRepository(EpicEntity);
  await mountRoutes(parent, "/epics", [
    new ListEpicsRoute(em),
    new GetEpicRoute(repo),
    new CreateEpicRoute(repo),
    new UpdateEpicRoute(repo),
    new DeleteEpicRoute(repo),
    new ListEpicUserStoriesRoute(em),
    new ListEpicTasksRoute(em),
    new ListHistoryByOwnerRoute(em, "epic"),
    ...satelliteRoutesFor(em, "epic"),
  ]);
}

export async function mountUserStories(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
): Promise<void> {
  const repo = em.getRepository(UserStoryEntity);
  await mountRoutes(parent, "/user-stories", [
    new ListUserStoriesRoute(em),
    new GetUserStoryRoute(repo),
    new CreateUserStoryRoute(repo),
    new UpdateUserStoryRoute(repo),
    new DeleteUserStoryRoute(repo),
    new ListUserStoryTasksRoute(em),
    new ListHistoryByOwnerRoute(em, "story"),
    new ListByStoryAcceptanceTestRoute(em),
    new CreateOnStoryAcceptanceTestRoute(em),
    new AcceptanceTestSummaryByStoryRoute(em),
    new ListByStoryDependenciesRoute(em),
    new CreateOnStoryDependencyRoute(em),
    ...satelliteRoutesFor(em, "story"),
  ]);
}

export async function mountAcceptanceTests(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
): Promise<void> {
  const repo = em.getRepository(AcceptanceTestEntity);
  await mountRoutes(parent, "/acceptance-tests", [
    new UpdateAcceptanceTestRoute(repo),
    new DeleteAcceptanceTestRoute(repo),
  ]);
}

export async function mountStoryDependencies(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
): Promise<void> {
  const repo = em.getRepository(StoryDependencyEntity);
  await mountRoutes(parent, "/story-dependencies", [new DeleteStoryDependencyRoute(repo)]);
}

export async function mountTasks(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
): Promise<void> {
  const repo = em.getRepository(TaskEntity);
  await mountRoutes(parent, "/tasks", [
    new ListTasksRoute(em),
    new GetTaskRoute(repo),
    new CreateTaskRoute(repo, em as SqlEntityManager),
    new UpdateTaskRoute(repo),
    new DeleteTaskRoute(repo),
    new ListTaskCommentsRoute(em),
    new AddTaskCommentRoute(em),
    new ListTaskAttachmentsRoute(em),
    new AddTaskAttachmentRoute(em),
    new UploadTaskAttachmentRoute(em),
    new ListTaskHistoryRoute(em),
    new ListTaskAssigneesRoute(em),
    new AddTaskAssigneeRoute(em),
    new RemoveTaskAssigneeRoute(em),
  ]);
}

export async function mountSprints(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
): Promise<void> {
  const repo = em.getRepository(SprintEntity);
  await mountRoutes(parent, "/sprints", [
    new ListSprintsRoute(em),
    new GetSprintRoute(repo),
    new CreateSprintRoute(em),
    new UpdateSprintRoute(repo),
    new DeleteSprintRoute(repo),
    new StartSprintRoute(em),
    new StopSprintRoute(em),
    new CloseSprintPreviewRoute(em),
    new AddSprintItemsRoute(em),
    new ListSprintTasksRoute(em),
    new ListHistoryByOwnerRoute(em, "sprint"),
    new GetSprintBurndownRoute(em),
    new CreateSprintBurndownSnapshotRoute(em),
  ]);
}

export async function mountComments(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
): Promise<void> {
  await mountRoutes(parent, "/comments", [
    new GetCommentRoute(em),
    new UpdateCommentRoute(em),
    new DeleteCommentRoute(em),
  ]);
}

export async function mountAttachments(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
): Promise<void> {
  await mountRoutes(parent, "/attachments", [
    new GetAttachmentRoute(em),
    new DeleteAttachmentRoute(em),
  ]);
}

export async function mountSearch(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
): Promise<void> {
  await mountRoutes(parent, "/search", [new SearchRoute(em)]);
}

export async function mountDashboard(
  parent: FastifyInstanceTypeForModule,
  em: EntityManager,
  timeTrackingPort: TimeTrackingPort,
): Promise<void> {
  await mountRoutes(parent, "/dashboard", [new DashboardRoute(em, timeTrackingPort)]);
}
