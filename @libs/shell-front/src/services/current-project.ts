import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";

const STORAGE_KEY = "sprintforge:current-project";

export default class CurrentProjectService extends Service {
  @tracked currentProjectId: string | null = null;

  setup() {
    this.currentProjectId = localStorage.getItem(STORAGE_KEY);
  }

  setCurrent(id: string) {
    this.currentProjectId = id;
    localStorage.setItem(STORAGE_KEY, id);
  }

  ensureDefault(availableIds: readonly string[]): string | null {
    if (availableIds.length === 0) return null;
    if (
      this.currentProjectId &&
      availableIds.includes(this.currentProjectId)
    ) {
      return this.currentProjectId;
    }
    const next = availableIds[0] ?? null;
    if (next) this.setCurrent(next);
    return next;
  }

  clear() {
    this.currentProjectId = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  get current(): string | null {
    return this.currentProjectId;
  }
}

declare module "@ember/service" {
  interface Registry {
    "current-project": CurrentProjectService;
  }
}
