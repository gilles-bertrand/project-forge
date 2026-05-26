import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import TableGenericPrefab, {
  type TableParams,
} from '@triptyk/ember-ui/components/prefabs/tpk-table-generic-prefab';
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
  @service declare intl: IntlService;

  @tracked tableApi: TableApi | null = null;

  constructor(owner: unknown, args: ProjectsTableSignature['Args']) {
    super(owner as never, args);
    args.registerReload?.(() => this.tableApi?.reloadData());
  }

  private toProject(element: unknown): Project | null {
    if (!element || typeof element !== 'object') return null;
    const el = element as Record<string, unknown> & { attributes?: Record<string, unknown> };
    // If it has an `attributes` field, it's a raw JSON:API resource — flatten it
    if (el.attributes && typeof el.attributes === 'object') {
      return { id: el.id, ...el.attributes } as unknown as Project;
    }
    // Otherwise assume it's already a hydrated record
    return el as unknown as Project;
  }

  private registerApi(api: TableApi) {
    this.tableApi = api;
  }

  get tableParams(): TableParams {
    return {
      entity: 'projects',
      pageSizes: [10, 25, 50],
      defaultSortColumn: 'name',
      registerApi: (api: TableApi) => this.registerApi(api),
      rowClick: (element) => {
        const project = this.toProject(element);
        if (project) this.args.onActivate(project);
      },
      columns: [
        {
          field: 'name',
          headerName: this.intl.t('projects.table.headers.name'),
          sortable: true,
        },
        {
          field: 'status',
          headerName: this.intl.t('projects.table.headers.status'),
          sortable: true,
        },
        {
          field: 'responsibleId',
          headerName: this.intl.t('projects.table.headers.responsible'),
          sortable: false,
        },
        {
          field: 'createdAt',
          headerName: this.intl.t('projects.table.headers.createdAt'),
          sortable: true,
        },
      ],
      actionMenu: [
        {
          name: this.intl.t('projects.table.actions.edit'),
          action: (element: unknown) => {
            const project = this.toProject(element);
            if (project) this.args.onEdit?.(project);
          },
        },
        {
          name: this.intl.t('projects.table.actions.delete'),
          action: (element: unknown) => {
            const project = this.toProject(element);
            if (project) this.args.onDelete?.(project);
          },
        },
      ],
    };
  }

  <template>
    <TableGenericPrefab @tableParams={{this.tableParams}} />
  </template>
}
