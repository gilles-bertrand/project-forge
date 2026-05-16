import type Owner from "@ember/owner";

// N'utilise PAS moduleRegistry() — évite les reloads Vite dans les tests
// Services enregistrés manuellement dans les tests (feedback-testapp-no-moduleregistry)
export function initialize(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _owner: Owner,
): Promise<void> {
  return Promise.resolve();
}
