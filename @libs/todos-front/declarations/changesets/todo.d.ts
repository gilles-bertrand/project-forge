import ImmerChangeset from 'ember-immer-changeset';
export interface DraftTodo {
    id?: string | null;
    title?: string;
    description?: string;
    completed?: boolean;
}
export declare class TodoChangeset extends ImmerChangeset<DraftTodo> {
}
//# sourceMappingURL=todo.d.ts.map