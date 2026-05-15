import type Owner from '@ember/owner';
import { buildRegistry } from 'ember-strict-application-resolver/build-registry';

export function moduleRegistry() {
  return buildRegistry({
    ...import.meta.glob('./routes/**/*.{js,ts,gts}', { eager: true }),
    ...import.meta.glob('./templates/**/*.{js,ts,gts}', { eager: true }),
    ...import.meta.glob('./components/**/*.{js,ts,gts}', { eager: true }),
    ...import.meta.glob('./services/**/*.{js,ts}', { eager: true }),
  })();
}

// Pas de forRouter — les routes /backlog et /user-story-map sont déclarées par shell-front

export function initialize(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _owner: Owner
): Promise<void> {
  return Promise.resolve();
}
