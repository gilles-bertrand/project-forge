/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect as hardExpect, vi } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, settled } from '@ember/test-helpers';
import LoginForm, { pageObject } from '#src/components/forms/login-form.gts';
import { initializeTestApp, TestApp } from '../app.ts';
import type SessionService from 'ember-simple-auth/services/session';

const expect = hardExpect.soft;

vi.mock('ember-simple-auth/services/session', async (importActual) => {
  const actual =
    await importActual<typeof import('ember-simple-auth/services/session')>();
  return {
    ...actual,
    default: class MockSessionService extends actual.default {
      authenticate = vi.fn();
    },
  };
});

describe('login-form', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'Should call session.authenticate when form is valid',
    async function ({ context }) {
      await initializeTestApp(context.owner, 'en-us');

      const sessionService = context.owner.lookup(
        'service:session'
      ) as SessionService;

      await render(<template><LoginForm /></template>);

      await pageObject.email('test@example.com');
      await pageObject.password('strongpassword123');
      await pageObject.submit();

      expect(sessionService.authenticate).toHaveBeenCalledWith(
        'authenticator:jwt',
        {
          email: 'test@example.com',
          password: 'strongpassword123',
        }
      );
    }
  );

  renderingTest(
    'Should not call session.authenticate when email is invalid',
    async function ({ context }) {
      await initializeTestApp(context.owner, 'en-us');

      const sessionService = context.owner.lookup(
        'service:session'
      ) as SessionService;

      await render(<template><LoginForm /></template>);

      await pageObject.email('invalidemail');
      await pageObject.password('strongpassword123');
      await pageObject.submit();

      expect(sessionService.authenticate).not.toHaveBeenCalled();
    }
  );

  renderingTest(
    'Should not call session.authenticate when password is too short',
    async function ({ context }) {
      await initializeTestApp(context.owner, 'en-us');

      const sessionService = context.owner.lookup(
        'service:session'
      ) as SessionService;

      await render(<template><LoginForm /></template>);

      await pageObject.email('test@example.com');
      await pageObject.password('short');
      await pageObject.submit();

      expect(sessionService.authenticate).not.toHaveBeenCalled();
    }
  );

  renderingTest(
    'Should not call session.authenticate when both fields are invalid',
    async function ({ context }) {
      await initializeTestApp(context.owner, 'en-us');

      const sessionService = context.owner.lookup(
        'service:session'
      ) as SessionService;

      await render(<template><LoginForm /></template>);

      await pageObject.email('');
      await pageObject.password('');
      await pageObject.submit();

      expect(sessionService.authenticate).not.toHaveBeenCalled();
    }
  );

  renderingTest(
    'Should not render an error before any submission',
    async function ({ context }) {
      await initializeTestApp(context.owner, 'en-us');

      await render(<template><LoginForm /></template>);

      expect(pageObject.errorVisible).toBe(false);
    }
  );

  renderingTest(
    'Should display invalid-credentials error when authenticate rejects with 401',
    async function ({ context }) {
      await initializeTestApp(context.owner, 'en-us');

      const sessionService = context.owner.lookup(
        'service:session'
      ) as SessionService;
      (
        sessionService.authenticate as ReturnType<typeof vi.fn>
      ).mockRejectedValue({
        status: 401,
      });

      await render(<template><LoginForm /></template>);

      await pageObject.email('test@example.com');
      await pageObject.password('strongpassword123');
      await pageObject.submit();
      await settled();

      expect(pageObject.errorVisible).toBe(true);
      expect(pageObject.errorText).toContain(
        'users.forms.login.error.invalidCredentials'
      );
    }
  );

  renderingTest(
    'Should display a generic error when authenticate rejects with no status',
    async function ({ context }) {
      await initializeTestApp(context.owner, 'en-us');

      const sessionService = context.owner.lookup(
        'service:session'
      ) as SessionService;
      (
        sessionService.authenticate as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error('boom'));

      await render(<template><LoginForm /></template>);

      await pageObject.email('test@example.com');
      await pageObject.password('strongpassword123');
      await pageObject.submit();
      await settled();

      expect(pageObject.errorVisible).toBe(true);
      expect(pageObject.errorText).toContain('users.forms.login.error.generic');
    }
  );

  renderingTest(
    'Should clear a previous error on a new submission',
    async function ({ context }) {
      await initializeTestApp(context.owner, 'en-us');

      const sessionService = context.owner.lookup(
        'service:session'
      ) as SessionService;
      const authMock = sessionService.authenticate as ReturnType<typeof vi.fn>;
      authMock.mockRejectedValueOnce({ status: 401 });
      authMock.mockResolvedValueOnce(undefined);

      await render(<template><LoginForm /></template>);

      await pageObject.email('test@example.com');
      await pageObject.password('strongpassword123');
      await pageObject.submit();
      await settled();
      expect(pageObject.errorVisible).toBe(true);

      await pageObject.submit();
      await settled();
      expect(pageObject.errorVisible).toBe(false);
    }
  );
});
