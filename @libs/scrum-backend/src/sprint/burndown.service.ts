import { randomUUID } from "crypto";
import type { EntityManager } from "@mikro-orm/core";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { SprintBurndownSnapshotEntity } from "#src/sprint/sprint-burndown-snapshot.entity.js";
import { TaskEntity } from "#src/task/task.entity.js";

export type BurndownPoint = { day: string; remaining: number; taskCount: number };
export type BurndownIdealPoint = { day: string; remaining: number };
export type BurndownData = {
  actual: BurndownPoint[];
  ideal: BurndownIdealPoint[];
};

function toIsoDay(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}`;
}

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function diffInDays(a: Date, b: Date): number {
  const ms = startOfDayUtc(b).getTime() - startOfDayUtc(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export async function computeSnapshot(
  em: EntityManager,
  sprintId: string,
): Promise<{ created: boolean; snapshot: { id: string } }> {
  const tasks = await em.find(
    TaskEntity,
    { sprintId },
    { fields: ["status", "remainingHours", "points"] },
  );
  const remainingTasks = tasks.filter((t) => t.status !== "done");
  const remainingHoursTotal = remainingTasks.reduce((acc, t) => acc + (t.remainingHours ?? 0), 0);
  const remainingPointsTotal = remainingTasks.reduce((acc, t) => acc + (t.points ?? 0), 0);
  const taskCount = remainingTasks.length;

  const today = startOfDayUtc(new Date());
  const existing = await em.findOne(SprintBurndownSnapshotEntity, {
    sprintId,
    snapshotDate: today,
  });

  if (existing) {
    existing.remainingHoursTotal = remainingHoursTotal;
    existing.remainingPointsTotal = remainingPointsTotal;
    existing.taskCount = taskCount;
    await em.flush();
    return { created: false, snapshot: { id: existing.id } };
  }

  const snapshot = em.create(SprintBurndownSnapshotEntity, {
    id: randomUUID(),
    sprintId,
    snapshotDate: today,
    remainingHoursTotal,
    remainingPointsTotal,
    taskCount,
  });
  await em.flush();
  return { created: true, snapshot: { id: snapshot.id } };
}

export async function getBurndown(em: EntityManager, sprintId: string): Promise<BurndownData> {
  const sprint = await em.findOne(SprintEntity, { id: sprintId });
  if (!sprint) {
    return { actual: [], ideal: [] };
  }

  const snapshots = await em.find(
    SprintBurndownSnapshotEntity,
    { sprintId },
    { orderBy: { snapshotDate: "asc" } },
  );

  const actual: BurndownPoint[] = snapshots.map((s) => ({
    day: toIsoDay(s.snapshotDate),
    remaining: s.remainingHoursTotal,
    taskCount: s.taskCount,
  }));

  const startDay = startOfDayUtc(sprint.startDate);
  const endDay = startOfDayUtc(sprint.endDate);
  const totalDays = diffInDays(startDay, endDay);
  const initial = snapshots[0]?.remainingHoursTotal ?? 0;

  const ideal: BurndownIdealPoint[] = [];
  if (totalDays <= 0) {
    ideal.push({ day: toIsoDay(startDay), remaining: initial });
    if (totalDays === 0) {
      ideal.push({ day: toIsoDay(endDay), remaining: 0 });
    }
  } else {
    for (let i = 0; i <= totalDays; i++) {
      const dayDate = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
      const remaining = initial - (initial * i) / totalDays;
      ideal.push({ day: toIsoDay(dayDate), remaining });
    }
  }

  return { actual, ideal };
}
