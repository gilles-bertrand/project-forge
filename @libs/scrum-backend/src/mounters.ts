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
import {
  AddTaskCommentRoute,
  DeleteTaskCommentRoute,
  ListTaskCommentsRoute,
} from "#src/task/routes/comments.routes.js";
import {
  AddTaskAttachmentRoute,
  DeleteTaskAttachmentRoute,
  ListTaskAttachmentsRoute,
} from "#src/task/routes/attachments.routes.js";
import { ListTaskHistoryRoute } from "#src/task/routes/history.routes.js";
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
import { StartSprintRoute, StopSprintRoute } from "#src/sprint/routes/actions.routes.js";
import { ListSprintTasksRoute } from "#src/sprint/routes/relationships.routes.js";

import { SearchRoute } from "#src/search/search.route.js";
import { DashboardRoute } from "#src/dashboard/dashboard.route.js";

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
    new ListProjectMembersRoute(em),
    new AddProjectMemberRoute(em),
    new RemoveProjectMemberRoute(em),
    new ListProjectTasksRoute(em),
    new ListProjectSprintsRoute(em),
    new ListProjectEpicsRoute(em),
    new ListProjectUserStoriesRoute(em),
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
  ]);
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
    new DeleteTaskCommentRoute(em),
    new ListTaskAttachmentsRoute(em),
    new AddTaskAttachmentRoute(em),
    new DeleteTaskAttachmentRoute(em),
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
    new CreateSprintRoute(repo),
    new UpdateSprintRoute(repo),
    new DeleteSprintRoute(repo),
    new StartSprintRoute(em),
    new StopSprintRoute(em),
    new ListSprintTasksRoute(em),
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
