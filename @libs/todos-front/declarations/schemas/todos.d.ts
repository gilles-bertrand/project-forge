import { type WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';
declare const TodoSchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default TodoSchema;
export type Todo = WithLegacy<{
    createdAt: string;
    updatedAt: string;
    title: string;
    description: string;
    completed: boolean;
    [Type]: 'todos';
}>;
//# sourceMappingURL=todos.d.ts.map