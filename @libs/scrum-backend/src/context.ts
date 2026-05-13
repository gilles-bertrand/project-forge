import type { EntityManager } from "@mikro-orm/core";

export interface ScrumLibraryContext {
  em: EntityManager;
  configuration: {
    jwtSecret: string;
  };
}
