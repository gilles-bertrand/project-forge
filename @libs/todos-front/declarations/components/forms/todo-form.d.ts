import Component from '@glimmer/component';
import type TodoService from '#src/services/todo.ts';
import type { TodoChangeset } from '#src/changesets/todo.ts';
import { createTodoValidationSchema, editTodoValidationSchema, type UpdatedTodo, type ValidatedTodo } from '#src/components/forms/todo-validation.ts';
import type RouterService from '@ember/routing/router-service';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';
import { type IntlService } from 'ember-intl';
import type ImmerChangeset from 'ember-immer-changeset';
import HandleSaveService from '@libs/shared-front/services/handle-save';
interface TodosFormArgs {
    changeset: TodoChangeset;
    validationSchema: ReturnType<typeof createTodoValidationSchema> | ReturnType<typeof editTodoValidationSchema>;
}
export default class TodosForm extends Component<TodosFormArgs> {
    todo: TodoService;
    router: RouterService;
    flashMessages: FlashMessageService;
    intl: IntlService;
    handleSave: HandleSaveService;
    onSubmit: (data: ValidatedTodo | UpdatedTodo, c: ImmerChangeset<ValidatedTodo | UpdatedTodo>) => Promise<void>;
    tpkButton: () => void;
}
export declare const pageObject: import("ember-cli-page-object/-private").Component<{
    scope: string;
    title: import("ember-cli-page-object/-private").MethodDescriptor<(<T>(this: T, clueOrContent: string, content?: string) => T)>;
    description: import("ember-cli-page-object/-private").MethodDescriptor<(<T>(this: T, clueOrContent: string, content?: string) => T)>;
    completed: import("ember-cli-page-object/-private").MethodDescriptor<(<T>(this: T) => T)>;
    submit: import("ember-cli-page-object/-private").MethodDescriptor<(<T>(this: T) => T)>;
}>;
export {};
//# sourceMappingURL=todo-form.d.ts.map