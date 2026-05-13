import type { ScrumLibraryContext } from "#src/context.js";

// ScrumModule complété en P2 avec setupRoutes (projects, epics, user-stories, tasks, sprints)
export class ScrumModule {
  private constructor() {}

  public static init(_context: ScrumLibraryContext): ScrumModule {
    return new ScrumModule();
  }
}
