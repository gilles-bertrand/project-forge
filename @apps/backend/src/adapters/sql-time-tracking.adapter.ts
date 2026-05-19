import type { SqlEntityManager } from "@mikro-orm/postgresql";
import type { TimeTrackingPort } from "@libs/scrum-backend";

/**
 * Adapter SQL pour TimeTrackingPort.
 *
 * Vit dans @apps/backend (couche de composition) car c'est ici qu'on peut
 * légitimement importer à la fois @libs/scrum-backend et @libs/time-tracking-backend
 * sans violer l'indépendance des bounded contexts.
 */
export class SqlTimeTrackingAdapter implements TimeTrackingPort {
  public constructor(private em: SqlEntityManager) {}

  public async sumHoursByUserAndSprint(userId: string, sprintId: string): Promise<number> {
    const result = (await this.em.getConnection().execute(
      `SELECT COALESCE(SUM(t.hours), 0) AS total
         FROM time_entries t
         JOIN tasks tk ON tk.id = t.task_id
         WHERE t.user_id = ? AND tk.sprint_id = ?`,
      [userId, sprintId],
    )) as Array<{ total: string | number }>;
    return Number(result[0]?.total ?? 0);
  }
}
