import type Owner from "@ember/owner";
import type { DSL } from "@ember/routing/lib/dsl";
import { buildRegistry } from "ember-strict-application-resolver/build-registry";
import type CurrentProjectService from "./services/current-project.ts";

export function moduleRegistry() {
  return buildRegistry({
    ...import.meta.glob("./routes/**/*.{js,ts,gts}", { eager: true }),
    ...import.meta.glob("./templates/**/*.{js,ts,gts}", { eager: true }),
    ...import.meta.glob("./components/**/*.{js,ts,gts}", { eager: true }),
    ...import.meta.glob("./services/**/*.{js,ts}", { eager: true }),
  })();
}

export function forRouter(this: DSL) {
  this.route("projects");
  this.route("backlog");
  this.route("kanban");
  this.route("user-story-map");
  this.route("sprints");
  this.route("time-tracking");
  this.route("settings");
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function initialize(owner: Owner) {
  const currentProject = owner.lookup("service:current-project") as
    | CurrentProjectService
    | undefined;
  currentProject?.setup();
}
