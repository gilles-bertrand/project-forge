import type Owner from "@ember/owner";
import { buildRegistry } from "ember-strict-application-resolver/build-registry";

export function moduleRegistry() {
  return buildRegistry({
    ...import.meta.glob("./routes/**/*.{js,ts,gts}", { eager: true }),
    ...import.meta.glob("./templates/**/*.{js,ts,gts}", { eager: true }),
    ...import.meta.glob("./components/**/*.{js,ts,gts}", { eager: true }),
    ...import.meta.glob("./services/**/*.{js,ts}", { eager: true }),
  })();
}

// Pas de forRouter — la route /projects est déjà déclarée par shell-front

export function initialize(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _owner: Owner,
): Promise<void> {
  // Pas de boot logic — la liste se charge via dashboard.ts model()
  return Promise.resolve();
}
