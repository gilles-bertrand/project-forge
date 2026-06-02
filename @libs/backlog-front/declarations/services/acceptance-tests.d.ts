import Service from '@ember/service';
import type { Store } from '@warp-drive/core';
import type { AcceptanceTest, AcceptanceTestState } from '#src/schemas/acceptance-tests.ts';
export interface NewAcceptanceTestPayload {
    name: string;
    description?: string;
    state?: AcceptanceTestState;
    rank?: number;
    createdById?: string | null;
}
export interface UpdateAcceptanceTestPayload {
    name?: string;
    description?: string;
    state?: AcceptanceTestState;
    rank?: number;
}
export default class AcceptanceTestsService extends Service {
    store: Store;
    loading: boolean;
    loadByStory(userStoryId: string): Promise<AcceptanceTest[]>;
    loadByTask(taskId: string): Promise<AcceptanceTest[]>;
    create(userStoryId: string, payload: NewAcceptanceTestPayload): Promise<AcceptanceTest>;
    createOnTask(taskId: string, payload: NewAcceptanceTestPayload): Promise<AcceptanceTest>;
    update(id: string, payload: UpdateAcceptanceTestPayload): Promise<AcceptanceTest>;
    remove(id: string): Promise<void>;
}
declare module '@ember/service' {
    interface Registry {
        'acceptance-tests': AcceptanceTestsService;
    }
}
//# sourceMappingURL=acceptance-tests.d.ts.map