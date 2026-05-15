import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export type ThemeMode = 'sprintforge-dark' | 'sprintforge-light';

const STORAGE_KEY = 'sprintforge:theme';
const DEFAULT_MODE: ThemeMode = 'sprintforge-dark';

export default class ThemeService extends Service {
  @tracked mode: ThemeMode = DEFAULT_MODE;

  setup(): void {
    const saved = this.readSavedMode();
    this.apply(saved ?? DEFAULT_MODE);
  }

  toggle(): void {
    this.apply(
      this.mode === 'sprintforge-dark'
        ? 'sprintforge-light'
        : 'sprintforge-dark'
    );
  }

  apply(mode: ThemeMode): void {
    this.mode = mode;
    document.documentElement.setAttribute('data-theme', mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage indisponible — silent
    }
  }

  private readSavedMode(): ThemeMode | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      // Migration P3 → P3.5 : ancien format 'dark'/'light' → nouveau format
      if (v === 'dark') return 'sprintforge-dark';
      if (v === 'light') return 'sprintforge-light';
      if (v === 'sprintforge-dark' || v === 'sprintforge-light') return v;
      return null;
    } catch {
      return null;
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    theme: ThemeService;
  }
}
