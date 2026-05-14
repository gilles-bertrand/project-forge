import { TodoChangeset } from '#src/changesets/todo.ts';
import Component from '@glimmer/component';
import type { TodosCreateRouteSignature } from './create';
import type Owner from '@ember/owner';
import type { IntlService } from 'ember-intl';
import { createTodoValidationSchema } from '#src/components/forms/todo-validation.ts';
export default class TodosCreateRouteTemplate extends Component<TodosCreateRouteSignature> {
    intl: IntlService;
    validationSchema: ReturnType<typeof createTodoValidationSchema>;
    changeset: TodoChangeset;
    constructor(owner: Owner, args: TodosCreateRouteSignature);
}
//# sourceMappingURL=create-template.d.ts.map