import type { AcceptanceTestEntityType } from "#src/acceptance-test/acceptance-test.entity.js";
import type { AcceptanceTestAggregateState } from "#src/types.js";

/**
 * Aggregate the state of a set of acceptance tests into a single Story-level value.
 *  - none         : no acceptance tests at all
 *  - has-failed   : at least one failed
 *  - all-success  : every test passed
 *  - pending      : at least one to-check, no failure
 */
export function aggregateTestState(ats: AcceptanceTestEntityType[]): AcceptanceTestAggregateState {
  if (ats.length === 0) return "none";
  if (ats.some((at) => at.state === "failed")) return "has-failed";
  if (ats.every((at) => at.state === "success")) return "all-success";
  return "pending";
}
