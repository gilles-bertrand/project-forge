import { describe, it, expect } from "vitest";
import { jsonApiSerializeTimeEntry } from "#src/serializers/time-entry.serializer.js";

const NOW = new Date("2025-01-20T00:00:00Z");

describe("time-entry serializer", () => {
  it("returns JSON:API shape with ISO dates", () => {
    const out = jsonApiSerializeTimeEntry({
      id: "te1",
      taskId: "t1",
      userId: "u1",
      projectId: "p1",
      hours: 2.5,
      date: NOW,
      description: "ok",
      createdAt: NOW,
    });
    expect(out).toEqual({
      id: "te1",
      type: "time-entries",
      attributes: {
        taskId: "t1",
        userId: "u1",
        projectId: "p1",
        hours: 2.5,
        date: NOW.toISOString(),
        description: "ok",
        createdAt: NOW.toISOString(),
      },
    });
  });

  it("description null preserved", () => {
    const out = jsonApiSerializeTimeEntry({
      id: "te2",
      taskId: "t1",
      userId: "u1",
      projectId: "p1",
      hours: 1,
      date: NOW,
      description: null,
      createdAt: NOW,
    });
    expect(out.attributes.description).toBe(null);
  });
});
