import Component from '@glimmer/component';
import { LinkTo } from '@ember/routing';
import { t } from 'ember-intl';
import UsersGrid from '#src/components/users-grid.gts';
import type UsersIndexRoute from './index.gts';

interface DashboardUsersIndexSignature {
  Args: {
    model: Awaited<ReturnType<UsersIndexRoute['model']>>;
  };
}

export default class DashboardUsersIndex extends Component<DashboardUsersIndexSignature> {
  get userCount(): number {
    return this.args.model.length;
  }

  <template>
    <div class="space-y-6">
      <header class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold" data-test-title>
            {{t "users.pages.list.title"}}
          </h1>
          <p class="opacity-60">
            {{t "users.pages.list.subtitle" count=this.userCount}}
          </p>
        </div>
        <LinkTo
          @route="dashboard.users.create"
          class="btn btn-primary btn-sm gap-2"
          data-test-add-user
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="size-4 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          {{t "users.table.actions.addUser"}}
        </LinkTo>
      </header>
      <UsersGrid @users={{@model}} />
    </div>
  </template>
}
