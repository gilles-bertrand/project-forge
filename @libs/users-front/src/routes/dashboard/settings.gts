import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type CurrentUserService from '#src/services/current-user.ts';

export interface SettingsModel {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  notifPrefs: { email: boolean; assignedTasks: boolean; weeklyDigest: boolean };
}

export default class DashboardSettingsRoute extends Route {
  @service declare currentUser: CurrentUserService;

  async model(): Promise<SettingsModel> {
    const user = this.currentUser.currentUser;
    const userId = user.id as string;
    let notifPrefs = { email: true, assignedTasks: true, weeklyDigest: false };
    try {
      const res = await fetch(`/api/v1/users/${userId}/notifications`);
      const json = (await res.json()) as {
        data: { attributes: typeof notifPrefs };
      };
      notifPrefs = json.data.attributes;
    } catch {
      /* use defaults */
    }
    return {
      userId,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      role: user.role ?? '',
      notifPrefs,
    };
  }
}
