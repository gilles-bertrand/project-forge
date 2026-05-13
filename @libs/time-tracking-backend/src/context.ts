import type { EntityManager } from "@mikro-orm/core";

export interface TimeTrackingLibraryContext {
  em: EntityManager;
  configuration: {
    jwtSecret: string;
  };
}
