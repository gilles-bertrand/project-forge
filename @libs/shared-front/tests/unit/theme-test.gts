import { describe, expect } from 'vitest';
import { test } from 'ember-vitest';
import { initializeTestApp, TestApp } from '../app';

describe('Service | Theme | Unit', () => {
  // eslint-disable-next-line no-empty-pattern
  test.scoped({ app: ({}, use) => use(TestApp) });

  test('apply("light") ajoute la classe sur <html>', async ({ context }) => {
    await initializeTestApp(context.owner, 'fr-fr');
    const theme = context.owner.lookup('service:theme');
    theme.apply('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    theme.apply('dark');
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  test('toggle bascule entre dark et light', async ({ context }) => {
    await initializeTestApp(context.owner, 'fr-fr');
    const theme = context.owner.lookup('service:theme');
    theme.apply('dark');
    theme.toggle();
    expect(theme.mode).toBe('light');
    theme.toggle();
    expect(theme.mode).toBe('dark');
  });
});
