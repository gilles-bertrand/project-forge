import { raw } from "@mikro-orm/core";
import type { SqlEntityManager } from "@mikro-orm/postgresql";
import { TaskEntity } from "#src/task/task.entity.js";

export async function getNextTaskNumber(em: SqlEntityManager, projectId: string): Promise<number> {
  return em.transactional(async (txEm) => {
    const result = (await txEm
      .createQueryBuilder(TaskEntity)
      .select(raw("max(number) as max"))
      .where({ projectId })
      .execute("get")) as { max: number | null } | null;
    const max = result?.max ?? 1000;
    return max + 1;
  });
}
