import { describe, expect } from 'vitest';
import { test } from 'ember-vitest';
import { initializeTestApp, TestApp } from '../app';

describe('Service | Theme | Unit', () => {
  // eslint-disable-next-line no-empty-pattern
  test.scoped({ app: ({}, use) => use(TestApp) });

  test('apply("sprintforge-light") set data-theme sur <html>', async ({
    context,
  }) => {
    await initializeTestApp(context.owner, 'fr-fr');
    const theme = context.owner.lookup('service:theme');
    theme.apply('sprintforge-light');
    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'sprintforge-light'
    );
    theme.apply('sprintforge-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe(
      'sprintforge-dark'
    );
  });

  test('toggle bascule entre sprintforge-dark et sprintforge-light', async ({
    context,
  }) => {
    await initializeTestApp(context.owner, 'fr-fr');
    const theme = context.owner.lookup('service:theme');
    theme.apply('sprintforge-dark');
    theme.toggle();
    expect(theme.mode).toBe('sprintforge-light');
    theme.toggle();
    expect(theme.mode).toBe('sprintforge-dark');
  });
});
