import Service from '@ember/service';
import { type Store } from '@warp-drive/core';
import type { Epic, EpicType } from '#src/schemas/epics.ts';
export type NewEpicPayload = {
    title: string;
    description: string;
    projectId: string;
    status?: Epic['status'];
    notes?: string | null;
    color?: string;
    type?: EpicType;
    value?: number | null;
    rank?: number;
    tags?: string[];
};
export type UpdateEpicPayload = {
    title?: string;
    description?: string;
    status?: Epic['status'];
    notes?: string | null;
    color?: string;
    type?: EpicType;
    value?: number | null;
    rank?: number;
    tags?: string[];
};
export default class EpicsService extends Service {
    store: Store;
    list: Epic[];
    loading: boolean;
    loadByProject(projectId: string): Promise<Epic[]>;
    findById(id: string): Promise<Epic>;
    update(id: string, projectId: string, attrs: UpdateEpicPayload): Promise<Epic>;
    delete(id: string, projectId: string): Promise<void>;
    create(data: NewEpicPayload): Promise<Epic>;
}
declare module '@ember/service' {
    interface Registry {
        epics: EpicsService;
    }
}
//# sourceMappingURL=epics.d.ts.map