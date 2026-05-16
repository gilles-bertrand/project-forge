import Component from '@glimmer/component';
import { t } from 'ember-intl';
import UserAvatar from './user-avatar.gts';
import type { UserData } from '../schemas/users';
import { PROJECT_NAMES } from '../data/project-names.ts';

interface UserCardSignature {
  Args: { user: UserData };
}

class UserCard extends Component<UserCardSignature> {
  get projectNames(): string[] {
    return (this.args.user.projectIds ?? []).map(
      (id) => PROJECT_NAMES[id] ?? id
    );
  }

  get hasProjects(): boolean {
    return this.projectNames.length > 0;
  }

  get projectCount(): number {
    return this.projectNames.length;
  }

  <template>
    <div class="card bg-base-200 shadow p-5" data-test-user-card>
      <div class="flex items-center gap-4 mb-4">
        <UserAvatar
          @firstName={{@user.firstName}}
          @lastName={{@user.lastName}}
        />
        <div>
          <h3 class="font-bold text-lg">{{@user.firstName}}
            {{@user.lastName}}</h3>
          <p class="text-sm opacity-60">{{@user.role}}</p>
        </div>
      </div>
      <div class="space-y-2 text-sm mb-4">
        <div class="flex items-center gap-2">
          <span>✉</span>
          <span>{{@user.email}}</span>
        </div>
        <div class="flex items-center gap-2">
          <span>📁</span>
          <span>{{t "users.card.projects.count" count=this.projectCount}}</span>
        </div>
      </div>
      {{#if this.hasProjects}}
        <div>
          <p class="text-xs opacity-60 mb-2">{{t
              "users.card.projects.label"
            }}</p>
          <div class="flex flex-wrap gap-1">
            {{#each this.projectNames as |name|}}
              <span class="badge badge-soft text-xs">{{name}}</span>
            {{/each}}
          </div>
        </div>
      {{/if}}
    </div>
  </template>
}

export default UserCard;
