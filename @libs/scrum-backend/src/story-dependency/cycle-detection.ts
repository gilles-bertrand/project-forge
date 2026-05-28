/**
 * Pure DFS cycle detection helpers. Extracted as a standalone function so it can
 * be unit-tested without booting an EntityManager.
 *
 * `getOutgoing(storyId)` returns the list of story ids that the given story
 * BLOCKS (outgoing `blocks` edges). The traversal stops as soon as we reach
 * `targetId` or after `maxNodes` distinct nodes have been visited.
 */
export const DEFAULT_MAX_NODES = 1000;

export async function canReach(
  startId: string,
  targetId: string,
  getOutgoing: (storyId: string) => Promise<string[]>,
  maxNodes = DEFAULT_MAX_NODES,
): Promise<boolean> {
  if (startId === targetId) return true;
  const visited = new Set<string>();
  const stack: string[] = [startId];
  while (stack.length > 0) {
    if (visited.size >= maxNodes) return false;
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    const next = await getOutgoing(current);
    for (const id of next) {
      if (id === targetId) return true;
      if (!visited.has(id)) stack.push(id);
    }
  }
  return false;
}
