import { TodoChangeset } from '#src/changesets/todo.ts';
import Component from '@glimmer/component';
import type { TodosEditRouteSignature } from './edit';
import { editTodoValidationSchema } from '#src/components/forms/todo-validation.ts';
import type { IntlService } from 'ember-intl';
import type Owner from '@ember/owner';
export default class TodosEditRouteTemplate extends Component<TodosEditRouteSignature> {
    intl: IntlService;
    validationSchema: ReturnType<typeof editTodoValidationSchema>;
    constructor(owner: Owner, args: TodosEditRouteSignature);
    changeset: TodoChangeset;
}
//# sourceMappingURL=edit-template.d.ts.map