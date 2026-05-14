import type { Todo } from '#src/schemas/todos.ts';
import { type UpdatedTodo, type ValidatedTodo } from '#src/components/forms/todo-validation.ts';
import Service from '@ember/service';
import { type Store } from '@warp-drive/core';
import type ImmerChangeset from 'ember-immer-changeset';
export default class TodoService extends Service {
    store: Store;
    save(data: ValidatedTodo | UpdatedTodo): Promise<void>;
    create(data: ValidatedTodo): Promise<void>;
    update(data: UpdatedTodo, changeset?: ImmerChangeset<ValidatedTodo>): Promise<void>;
    delete(data: UpdatedTodo): Promise<import("@warp-drive/core/types/request").StructuredDataDocument<Todo>>;
}
//# sourceMappingURL=todo.d.ts.map