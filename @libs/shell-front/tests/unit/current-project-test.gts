import { describe, expect, beforeEach, afterEach } from 'vitest';
import { test } from 'ember-vitest';
import { TestApp } from '../app';

describe('Service | CurrentProject | Unit', () => {
  // eslint-disable-next-line no-empty-pattern
  test.scoped({ app: ({}, use) => use(TestApp) });

  beforeEach(() => {
    localStorage.removeItem('sprintforge:current-project');
  });

  afterEach(() => {
    localStorage.removeItem('sprintforge:current-project');
  });

  test('setCurrent saves to localStorage', ({ context }) => {
    const svc = context.owner.lookup(
      'service:current-project',
    );
    svc.setCurrent('proj-123');
    expect(svc.currentProjectId).toBe('proj-123');
    expect(localStorage.getItem('sprintforge:current-project')).toBe(
      'proj-123',
    );
  });

  test('clear removes from localStorage', ({ context }) => {
    const svc = context.owner.lookup(
      'service:current-project',
    );
    svc.setCurrent('proj-123');
    svc.clear();
    expect(svc.currentProjectId).toBeNull();
    expect(
      localStorage.getItem('sprintforge:current-project'),
    ).toBeNull();
  });

  test('setup reads from localStorage', ({ context }) => {
    localStorage.setItem('sprintforge:current-project', 'proj-456');
    const svc = context.owner.lookup(
      'service:current-project',
    );
    svc.setup();
    expect(svc.currentProjectId).toBe('proj-456');
  });
});
