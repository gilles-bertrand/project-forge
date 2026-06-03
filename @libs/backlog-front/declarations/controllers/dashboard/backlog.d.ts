import Controller from '@ember/controller';
/**
 * Backlog controller — exists solely to declare the `task` query param so the
 * task-detail modal is deep-linkable (`/backlog?task=<id>`) and shareable.
 * The template reads/writes it through the router service.
 */
export default class DashboardBacklogController extends Controller {
    queryParams: string[];
    task: string | null;
}
//# sourceMappingURL=backlog.d.ts.map