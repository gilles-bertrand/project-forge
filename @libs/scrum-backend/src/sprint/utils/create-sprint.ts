import { randomUUID } from "crypto";
import type { EntityManager } from "@mikro-orm/core";
import type { SqlEntityManager } from "@mikro-orm/postgresql";
import type { ProjectEntityType } from "#src/project/project.entity.js";
import type { SprintEntityType } from "#src/sprint/sprint.entity.js";
import { SprintEntity } from "#src/sprint/sprint.entity.js";
import { getNextSprintNumber } from "./sprint-numbering.js";

export interface CreateSprintOverrides {
  name?: string;
  goal?: string | null;
  startDate?: Date;
  endDate?: Date;
  velocityPoints?: number;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeDates(
  project: ProjectEntityType,
  previousSprint: SprintEntityType | null,
  overrides: CreateSprintOverrides,
): { startDate: Date; endDate: Date } {
  if (overrides.startDate && overrides.endDate) {
    return { startDate: overrides.startDate, endDate: overrides.endDate };
  }

  const durationDays = project.sprintDurationDays ?? 14;
  const startDate = overrides.startDate
    ? overrides.startDate
    : previousSprint
      ? addDays(previousSprint.endDate, 1)
      : startOfToday();

  const endDate = overrides.endDate ? overrides.endDate : addDays(startDate, durationDays - 1);

  return { startDate, endDate };
}

export async function createSprintForProject(
  em: EntityManager,
  project: ProjectEntityType,
  previousSprint: SprintEntityType | null,
  overrides: CreateSprintOverrides = {},
): Promise<SprintEntityType> {
  const number = await getNextSprintNumber(em as SqlEntityManager, project.id);
  const name = overrides.name ?? `Sprint ${String(number).padStart(3, "0")}`;
  const { startDate, endDate } = computeDates(project, previousSprint, overrides);
  const velocityPoints = overrides.velocityPoints ?? project.defaultVelocityPoints ?? 20;

  const now = new Date();
  const sprint = em.getRepository(SprintEntity).create({
    id: randomUUID(),
    number,
    name,
    goal: overrides.goal ?? null,
    projectId: project.id,
    startDate,
    endDate,
    status: "planned",
    velocityPoints,
    completedPoints: 0,
    createdAt: now,
    updatedAt: now,
  });
  await em.flush();
  return sprint;
}
