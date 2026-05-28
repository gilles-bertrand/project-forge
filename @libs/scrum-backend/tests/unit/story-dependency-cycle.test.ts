import { describe, it, expect } from "vitest";
import { canReach } from "#src/story-dependency/cycle-detection.js";

/** Build a getOutgoing function from an in-memory edge map. */
function makeGraph(edges: Record<string, string[]>) {
  return async (storyId: string): Promise<string[]> => edges[storyId] ?? [];
}

describe("canReach (cycle detection DFS)", () => {
  it("returns true when start === target", async () => {
    const reach = await canReach("A", "A", makeGraph({}));
    expect(reach).toBe(true);
  });

  it("returns false when no edges", async () => {
    const reach = await canReach("A", "B", makeGraph({}));
    expect(reach).toBe(false);
  });

  it("returns true for direct edge A -> B", async () => {
    const reach = await canReach("A", "B", makeGraph({ A: ["B"] }));
    expect(reach).toBe(true);
  });

  it("returns true for transitive edge A -> B -> C", async () => {
    const reach = await canReach("A", "C", makeGraph({ A: ["B"], B: ["C"] }));
    expect(reach).toBe(true);
  });

  it("returns false for disconnected components", async () => {
    const reach = await canReach("A", "Z", makeGraph({ A: ["B"], B: ["C"], X: ["Y"], Y: ["Z"] }));
    expect(reach).toBe(false);
  });

  it("handles existing cycles without infinite loop", async () => {
    const reach = await canReach("A", "Z", makeGraph({ A: ["B"], B: ["A", "C"], C: ["B"] }));
    expect(reach).toBe(false);
  });

  it("detects target inside an existing cycle", async () => {
    const reach = await canReach("A", "C", makeGraph({ A: ["B"], B: ["A", "C"], C: ["B"] }));
    expect(reach).toBe(true);
  });

  it("respects maxNodes safety bound", async () => {
    const edges: Record<string, string[]> = {};
    for (let i = 0; i < 50; i++) edges[`n${String(i)}`] = [`n${String(i + 1)}`];
    const reach = await canReach("n0", "n49", makeGraph(edges), 5);
    expect(reach).toBe(false);
  });
});
