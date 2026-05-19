import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type SessionService from 'ember-simple-auth/services/session';
import type { UserData } from '#src/schemas/users.ts';

interface UsersListResponse {
  data: Array<{ id: string; attributes: Omit<UserData, 'id'> }>;
}

export default class UsersIndexRoute extends Route {
  @service declare session: SessionService;

  async model(): Promise<UserData[]> {
    const auth = this.session.data.authenticated as
      | { data?: { accessToken?: string } }
      | undefined;
    const accessToken = auth?.data?.accessToken;
    const res = await fetch('/api/v1/users', {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    const json = (await res.json()) as UsersListResponse;
    return json.data.map((u) => ({ id: u.id, ...u.attributes }));
  }
}
