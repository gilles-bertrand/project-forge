import { describe, it, expect } from "vitest";
import type { TimeEntryEntityType } from "#src/entities/time-entry.entity.js";

describe("TimeEntryEntity — shape (round-trip)", () => {
  it("has all required properties", () => {
    const entry: TimeEntryEntityType = {
      id: "time-001",
      taskId: "task-1005",
      userId: "user-claire",
      projectId: "project-ecommerce",
      hours: 2.5,
      date: new Date("2025-01-20T09:00:00Z"),
      description: "Démarrage du formulaire inscription",
      createdAt: new Date("2025-01-20T09:00:00Z"),
    };

    expect(entry.hours).toBe(2.5);
    expect(entry.taskId).toBe("task-1005");
    expect(entry.description).toBe("Démarrage du formulaire inscription");
  });

  it("accepts null description", () => {
    const entry: TimeEntryEntityType = {
      id: "time-002",
      taskId: "task-1006",
      userId: "user-claire",
      projectId: "project-ecommerce",
      hours: 1.0,
      date: new Date("2025-01-21T10:00:00Z"),
      description: null,
      createdAt: new Date("2025-01-21T10:00:00Z"),
    };

    expect(entry.description).toBeNull();
  });
});
