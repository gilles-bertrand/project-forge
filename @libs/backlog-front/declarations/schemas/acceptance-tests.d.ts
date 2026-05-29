import { type WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';
declare const AcceptanceTestSchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default AcceptanceTestSchema;
export type AcceptanceTestState = 'to-check' | 'failed' | 'success';
export interface AcceptanceTest extends WithLegacy<{
    [Type]: 'acceptance-tests';
}> {
    id: string;
    userStoryId: string;
    name: string;
    description: string;
    state: AcceptanceTestState;
    rank: number;
    createdById: string | null;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=acceptance-tests.d.ts.map