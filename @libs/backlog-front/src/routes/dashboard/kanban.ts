import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type TasksService from '../../services/tasks.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Sprint } from '../../schemas/sprints.ts';

interface KanbanModel {
  projectId: string | null;
  sprint: Sprint | null;
}

export default class DashboardKanbanRoute extends Route {
  @service declare tasks: TasksService;
  @service declare currentProject: CurrentProjectService;

  async model(): Promise<KanbanModel> {
    const projectId = this.currentProject.currentProjectId;
    if (!projectId) return { projectId: null, sprint: null };

    await this.tasks.loadAllByProject(projectId);

    const sprintsResponse = await fetch(
      `/api/v1/projects/${projectId}/sprints`
    );
    const sprintsJson = (await sprintsResponse.json()) as {
      data: Array<{ id: string; attributes: Omit<Sprint, 'id'> }>;
    };
    const activeSprint = sprintsJson.data
      .map((s) => ({ id: s.id, ...s.attributes }))
      .find((s) => s.status === 'active');

    return { projectId, sprint: activeSprint ?? null };
  }
}
