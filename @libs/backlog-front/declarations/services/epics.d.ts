import Service from '@ember/service';
import { type Store } from '@warp-drive/core';
import type { Epic } from '#src/schemas/epics.ts';
export type NewEpicPayload = {
    title: string;
    description: string;
    projectId: string;
    status: Epic['status'];
};
export default class EpicsService extends Service {
    store: Store;
    list: Epic[];
    loading: boolean;
    loadByProject(projectId: string): Promise<Epic[]>;
    findById(id: string): Promise<Epic>;
    create(data: NewEpicPayload): Promise<Epic>;
}
declare module '@ember/service' {
    interface Registry {
        epics: EpicsService;
    }
}
//# sourceMappingURL=epics.d.ts.map