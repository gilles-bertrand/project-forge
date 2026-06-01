import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import AssigneeAvatarStack from '#src/components/assignee-avatar-stack.gts';
import type { MemberLite } from '#src/components/assignee-avatar-stack.gts';
import { TestApp } from '../app.ts';

const expect = hardExpect.soft;

const MEMBERS: MemberLite[] = [
  { id: 'u1', firstName: 'Alice', lastName: 'Dupont', color: null },
  { id: 'u2', firstName: 'Bob', lastName: 'Martin', color: null },
  { id: 'u3', firstName: 'Carol', lastName: 'Nguyen', color: null },
  { id: 'u4', firstName: 'David', lastName: 'Otto', color: null },
  { id: 'u5', firstName: 'Eve', lastName: 'Pinto', color: null },
];

describe('Integration | AssigneeAvatarStack', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  // T9 — affiche N avatars + +M au-delà du seuil
  renderingTest('shows max avatars and a +N overflow', async function () {
    const members = MEMBERS;
    await render(
      <template>
        <AssigneeAvatarStack @members={{members}} @max={{3}} />
      </template>
    );
    const avatars = document.querySelectorAll('[data-test-assignee-avatar]');
    expect(avatars.length).toBe(3);
    const more = document.querySelector('[data-test-assignee-avatar-more]');
    expect(more).toBeTruthy();
    expect(more?.textContent).toContain('+2');
  });

  renderingTest(
    'shows initials and no overflow under the cap',
    async function () {
      const members = MEMBERS.slice(0, 2);
      await render(
        <template>
          <AssigneeAvatarStack @members={{members}} @max={{3}} />
        </template>
      );
      const avatars = document.querySelectorAll('[data-test-assignee-avatar]');
      expect(avatars.length).toBe(2);
      expect(
        document.querySelector('[data-test-assignee-avatar-more]')
      ).toBeNull();
      const text = document.body.textContent ?? '';
      expect(text).toContain('AD'); // Alice Dupont
      expect(text).toContain('BM'); // Bob Martin
    }
  );
});
