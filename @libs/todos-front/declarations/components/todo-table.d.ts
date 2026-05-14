import type RouterService from '@ember/routing/router-service';
import Component from '@glimmer/component';
import { type TableParams } from '@triptyk/ember-ui/components/prefabs/tpk-table-generic-prefab';
import { type IntlService } from 'ember-intl';
import type TodoService from '#src/services/todo.ts';
import type { UpdatedTodo } from './forms/todo-validation';
import type FlashMessagesService from 'ember-cli-flash/services/flash-messages';
declare class TodosTable extends Component<object> {
    router: RouterService;
    intl: IntlService;
    todo: TodoService;
    flashMessages: FlashMessagesService;
    selectedTodoForDelete: UpdatedTodo | null;
    get isModalOpen(): boolean;
    get confirmQuestion(): string;
    get tableParams(): TableParams;
    onChangeCompleted: (element: UpdatedTodo) => Promise<void>;
    onAddTodo: () => void;
    openModalOnDelete: (element: UpdatedTodo) => void;
    onCloseModal: () => void;
    onConfirmDelete: () => Promise<void>;
}
export default TodosTable;
//# sourceMappingURL=todo-table.d.ts.map