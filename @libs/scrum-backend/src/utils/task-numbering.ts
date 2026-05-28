import type { SqlEntityManager } from "@mikro-orm/postgresql";

type AllocatedRow = { allocated: number };

/**
 * Allocate the next unique task number for a given project using an atomic
 * `UPDATE … RETURNING` on the per-project counter table. If no row exists
 * yet for the project (first task ever), the counter is initialized to 1002
 * and 1001 is returned.
 */
export async function getNextTaskNumber(em: SqlEntityManager, projectId: string): Promise<number> {
  const result = (await em.execute(
    `UPDATE project_task_counters
     SET next_number = next_number + 1
     WHERE project_id = ?
     RETURNING next_number - 1 AS allocated`,
    [projectId],
  )) as AllocatedRow[];

  const first = result[0];
  if (!first) {
    await em.execute(
      `INSERT INTO project_task_counters (project_id, next_number) VALUES (?, 1002)`,
      [projectId],
    );
    return 1001;
  }
  return Number(first.allocated);
}
