import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'sprintforge:theme';
const DEFAULT_MODE: ThemeMode = 'dark';

export default class ThemeService extends Service {
  @tracked mode: ThemeMode = DEFAULT_MODE;

  setup(): void {
    const saved = this.readSavedMode();
    this.apply(saved ?? DEFAULT_MODE);
  }

  toggle(): void {
    this.apply(this.mode === 'dark' ? 'light' : 'dark');
  }

  apply(mode: ThemeMode): void {
    this.mode = mode;
    const root = document.documentElement;
    if (mode === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage indisponible (mode privé) — silent
    }
  }

  private readSavedMode(): ThemeMode | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'dark' || v === 'light' ? v : null;
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
