import type { EntityManager } from "@mikro-orm/core";

// Context étendu en P2 avec la configuration Fastify/JWT
export interface ScrumLibraryContext {
  em: EntityManager;
}
