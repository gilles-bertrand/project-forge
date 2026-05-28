import { describe, it, expect } from "vitest";
import {
  assertStoryTransition,
  InvalidStoryTransitionError,
  isValidStoryTransition,
} from "#src/user-story/transitions.js";
import { STORY_STATUSES, type StoryStatus } from "#src/types.js";

describe("UserStory status transitions", () => {
  it("allows self-transition for every status", () => {
    for (const status of STORY_STATUSES) {
      expect(isValidStoryTransition(status, status)).toBe(true);
      expect(() => {
        assertStoryTransition(status, status);
      }).not.toThrow();
    }
  });

  it("allows known valid transitions", () => {
    const validPairs: Array<[StoryStatus, StoryStatus]> = [
      ["suggested", "accepted"],
      ["accepted", "suggested"],
      ["accepted", "estimated"],
      ["estimated", "accepted"],
      ["estimated", "planned"],
      ["planned", "estimated"],
      ["planned", "in-progress"],
      ["in-progress", "planned"],
      ["in-progress", "done"],
    ];
    for (const [from, to] of validPairs) {
      expect(isValidStoryTransition(from, to)).toBe(true);
    }
  });

  it("rejects illegal transitions (e.g. suggested → done)", () => {
    expect(isValidStoryTransition("suggested", "done")).toBe(false);
    expect(() => {
      assertStoryTransition("suggested", "done");
    }).toThrow(InvalidStoryTransitionError);
  });

  it("rejects transitions from terminal done state", () => {
    const terminalCandidates: StoryStatus[] = [
      "suggested",
      "accepted",
      "estimated",
      "planned",
      "in-progress",
    ];
    for (const to of terminalCandidates) {
      expect(isValidStoryTransition("done", to)).toBe(false);
    }
  });

  it("InvalidStoryTransitionError carries from/to", () => {
    try {
      assertStoryTransition("suggested", "in-progress");
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidStoryTransitionError);
      const e = error as InvalidStoryTransitionError;
      expect(e.from).toBe("suggested");
      expect(e.to).toBe("in-progress");
      expect(e.name).toBe("InvalidStoryTransitionError");
    }
  });
});
