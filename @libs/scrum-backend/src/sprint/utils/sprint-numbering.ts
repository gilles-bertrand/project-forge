import { raw } from "@mikro-orm/core";
import type { SqlEntityManager } from "@mikro-orm/postgresql";
import { SprintEntity } from "#src/sprint/sprint.entity.js";

export async function getNextSprintNumber(
  em: SqlEntityManager,
  projectId: string,
): Promise<number> {
  return em.transactional(async (txEm) => {
    const result = (await txEm
      .createQueryBuilder(SprintEntity)
      .select(raw("max(number) as max"))
      .where({ projectId })
      .execute("get")) as { max: number | null } | null;
    return (result?.max ?? 0) + 1;
  });
}
