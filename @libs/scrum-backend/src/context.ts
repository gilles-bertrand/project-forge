import type { EntityManager } from "@mikro-orm/core";
import type { TimeTrackingPort } from "#src/dashboard/time-tracking.port.js";

export interface ScrumLibraryContext {
  em: EntityManager;
  configuration: {
    jwtSecret: string;
  };
  timeTrackingPort: TimeTrackingPort;
}
