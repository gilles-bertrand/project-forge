import type { StoryStatus } from "#src/types.js";

/**
 * Valid state transitions for UserStory.status, aligned with iceScrum semantics.
 * - suggested → accepted (PO triage)
 * - accepted ↔ estimated (sizing back-and-forth)
 * - estimated → planned (added to a sprint)
 * - planned ↔ in-progress (sprint starts/stops)
 * - in-progress → done (terminal)
 */
const VALID_STORY_TRANSITIONS: Record<StoryStatus, readonly StoryStatus[]> = {
  suggested: ["accepted"],
  accepted: ["suggested", "estimated"],
  estimated: ["accepted", "planned"],
  planned: ["estimated", "in-progress"],
  "in-progress": ["planned", "done"],
  done: [],
} as const;

export function isValidStoryTransition(from: StoryStatus, to: StoryStatus): boolean {
  if (from === to) return true;
  return VALID_STORY_TRANSITIONS[from].includes(to);
}

export class InvalidStoryTransitionError extends Error {
  public constructor(
    public from: StoryStatus,
    public to: StoryStatus,
  ) {
    super(`Invalid story status transition: ${from} → ${to}`);
    this.name = "InvalidStoryTransitionError";
  }
}

export function assertStoryTransition(from: StoryStatus, to: StoryStatus): void {
  if (!isValidStoryTransition(from, to)) {
    throw new InvalidStoryTransitionError(from, to);
  }
}
