import UserCard from './user-card.gts';
import type { UserData } from '../schemas/users';
import { t } from 'ember-intl';
import type { TOC } from '@ember/component/template-only';

interface UsersGridSignature {
  Args: {
    users: UserData[];
  };
}

const UsersGrid: TOC<UsersGridSignature> = <template>
  <div class="grid grid-cols-3 gap-6">
    {{#each @users as |user|}}
      <UserCard @user={{user}} />
    {{else}}
      <p data-test-empty class="col-span-3 opacity-60 italic">{{t
          "users.pages.list.emptyState"
        }}</p>
    {{/each}}
  </div>
</template>;

export default UsersGrid;
