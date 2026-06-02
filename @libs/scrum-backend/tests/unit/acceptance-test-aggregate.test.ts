import { describe, it, expect } from "vitest";
import { aggregateTestState } from "#src/acceptance-test/aggregate.js";
import type { AcceptanceTestEntityType } from "#src/acceptance-test/acceptance-test.entity.js";

const NOW = new Date("2026-05-28T00:00:00Z");

function at(
  id: string,
  state: "to-check" | "failed" | "success",
  rank = 0,
): AcceptanceTestEntityType {
  return {
    id,
    userStoryId: "us-x",
    taskId: null,
    name: `AT ${id}`,
    description: "",
    state,
    rank,
    createdById: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("aggregateTestState", () => {
  it("returns 'none' when no acceptance tests", () => {
    expect(aggregateTestState([])).toBe("none");
  });

  it("returns 'all-success' when every test succeeded", () => {
    expect(aggregateTestState([at("1", "success"), at("2", "success")])).toBe("all-success");
  });

  it("returns 'has-failed' as soon as one test failed", () => {
    expect(aggregateTestState([at("1", "success"), at("2", "failed"), at("3", "to-check")])).toBe(
      "has-failed",
    );
  });

  it("returns 'pending' when there is at least one to-check and no failure", () => {
    expect(aggregateTestState([at("1", "success"), at("2", "to-check")])).toBe("pending");
  });

  it("returns 'pending' when only to-check", () => {
    expect(aggregateTestState([at("1", "to-check")])).toBe("pending");
  });
});
