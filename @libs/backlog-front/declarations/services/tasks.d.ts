import Service from '@ember/service';
import type { Store } from '@warp-drive/core';
import type { Task } from '#src/schemas/tasks.ts';
export default class TasksService extends Service {
    store: Store;
    backlog: Task[];
    all: Task[];
    loading: boolean;
    loadAllByProject(projectId: string): Promise<Task[]>;
    loadBacklog(projectId: string): Promise<Task[]>;
    loadByUserStory(userStoryId: string): Promise<Task[]>;
    findById(id: string): Promise<Task>;
}
declare module '@ember/service' {
    interface Registry {
        tasks: TasksService;
    }
}
//# sourceMappingURL=tasks.d.ts.map