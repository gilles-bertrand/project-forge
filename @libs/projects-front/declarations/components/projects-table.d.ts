import Component from '@glimmer/component';
import { type TableParams } from '@triptyk/ember-ui/components/prefabs/tpk-table-generic-prefab';
import type { TableApi } from '@triptyk/ember-ui/components/tpk-table-generic/table';
import type { IntlService } from 'ember-intl';
import type { Project } from '../schemas/projects.ts';
interface ProjectsTableSignature {
    Args: {
        onActivate: (project: Project) => void;
        onEdit?: (project: Project) => void;
        onDelete?: (project: Project) => void;
        registerReload?: (reload: () => void) => void;
    };
}
export default class ProjectsTable extends Component<ProjectsTableSignature> {
    intl: IntlService;
    tableApi: TableApi | null;
    constructor(owner: unknown, args: ProjectsTableSignature['Args']);
    private toProject;
    private registerApi;
    get tableParams(): TableParams;
}
export {};
//# sourceMappingURL=projects-table.d.ts.map