import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

const STORAGE_KEY = 'sprintforge:current-project';

export default class CurrentProjectService extends Service {
  @tracked currentProjectId: string | null = null;

  setup() {
    this.currentProjectId = localStorage.getItem(STORAGE_KEY);
  }

  setCurrent(id: string) {
    this.currentProjectId = id;
    localStorage.setItem(STORAGE_KEY, id);
  }

  clear() {
    this.currentProjectId = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  get current(): string | null {
    return this.currentProjectId;
  }
}

declare module '@ember/service' {
  interface Registry {
    'current-project': CurrentProjectService;
  }
}
