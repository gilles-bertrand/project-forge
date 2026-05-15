import type { Todo } from '#src/schemas/todos.ts';
import Route from '@ember/routing/route';
import type { Store } from '@warp-drive/core';
export type TodosEditRouteSignature = {
    model: Awaited<ReturnType<TodosEditRoute['model']>>;
    controller: undefined;
};
export default class TodosEditRoute extends Route {
    store: Store;
    model({ todo_id }: {
        todo_id: string;
    }): Promise<{
        todo: Todo;
    }>;
}
//# sourceMappingURL=edit.d.ts.map