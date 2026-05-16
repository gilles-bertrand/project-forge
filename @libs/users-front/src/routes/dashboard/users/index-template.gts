import Component from '@glimmer/component';
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
      <header>
        <h1 class="text-3xl font-bold" data-test-title>{{t
            "users.pages.list.title"
          }}</h1>
        <p class="opacity-60">{{t
            "users.pages.list.subtitle"
            count=this.userCount
          }}</p>
      </header>
      <UsersGrid @users={{@model}} />
    </div>
  </template>
}
