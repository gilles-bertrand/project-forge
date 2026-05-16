import Route from '@ember/routing/route';
import type { UserData } from '#src/schemas/users.ts';

export default class UsersIndexRoute extends Route {
  async model(): Promise<UserData[]> {
    const res = await fetch('/api/v1/users');
    const json = (await res.json()) as {
      data: Array<{ id: string; attributes: Omit<UserData, 'id'> }>;
    };
    return json.data.map((u) => ({ id: u.id, ...u.attributes }));
  }
}
