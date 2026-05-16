# P12 — Settings (profil, notifications, sécurité)

> Objectif : remplacer le placeholder `/settings` par une page fonctionnelle alignée avec `docs/figma-screenshots/09-settings.png`. 3 sections cards : **Profil utilisateur** (édition prénom/nom/email/rôle), **Notifications** (3 toggles + persistance mock), **Sécurité** (change password — mot de passe actuel + nouveau + confirmation). Lib cible : **extension de `@libs/users-front`** (cohérent avec P11). Pas de backend modifié pour P12 — endpoint `change-password` mocké côté MSW.

---

## 1. Contexte & rappels

### Acquis (P0–P11)
- **Placeholder shell-front** `/settings` actuel (à retirer) :
  - `@libs/shell-front/src/routes/dashboard/settings.ts`
  - `@libs/shell-front/src/templates/dashboard/settings.gts`
  - **Sidebar** "Paramètres" déjà câblé → `dashboard.settings` (P3, conservé).
- **`@libs/users-front` existant** :
  - `services/current-user.ts` — utilisateur courant chargé après login.
  - `services/user.ts` — méthodes `findById/update/delete` (existantes P0).
  - `components/forms/user-form.gts` — formulaire CRUD admin (réutilisable partiellement OU à dupliquer en `profile-form`).
  - `schemas/users.ts` — User étendu P11 (`role`, `projectIds`).
- **Mock current user** : actuellement le `GET /api/v1/users/profile` retourne `mockUsers[0]` (Alice Martin Product Owner P11).
- **Backend P2** : PATCH `/api/v1/users/:id` existe (utilisé par le form admin). Endpoint `change-password` **n'existe pas** (à mocker).

### Cible Figma (`09-settings.png`)
- **Header** : `<h1>Paramètres</h1>` + sous-titre "Gérez vos préférences et votre compte".
- **3 sections cards** (`card bg-base-200 shadow p-6`, full width stacked) :
  1. **Profil utilisateur** : titre seul, prénom/nom (2 cols grid), email (full), rôle (read-only, opacity 60), bouton "Sauvegarder" en bas-right (teal).
  2. **Notifications** (icône 🔔 + titre) : 3 lignes "label" + toggle/checkbox à droite :
     - "Notifications par email"
     - "Notifications de tâches assignées"
     - "Résumé hebdomadaire"
  3. **Sécurité** (icône 🔒 + titre) : 3 inputs vertical (Mot de passe actuel, Nouveau mot de passe, Confirmation) + bouton "Changer le mot de passe" en bas-right.

### Hors périmètre P12
- **Endpoint backend `change-password`** réel → P13 (P12 mock MSW retourne 200 OK si tous champs valides).
- **Persistance des préférences notifications côté backend** → P13 (P12 stocke en-mémoire dans le mock MSW, reset au reload mais visible cohérent).
- **Upload photo profil** → P14.
- **2FA / TOTP** → P14.
- **Suppression de compte** → V2.
- **Préférence theme/locale** : déjà géré ailleurs (theme service + intl) — pas en P12.
- **Notifications push browser** → V2.

---

## 2. Architectural Context

- **God Nodes touchés** : aucun. Aucune modification de schema, service ou composant central.
- **Communities touchées** : Users domain uniquement.
- **Cross-cutting contracts** : aucun (extension de page existante).
- **Risque low** : pas de nouvelle lib, pas de nouveau schema WarpDrive, pas de cross-lib import.

---

## 3. Décisions techniques

### D1. Extension de `@libs/users-front` (pas de nouvelle lib `settings-front`)
Le macro-plan suggère "ou nouvel addon settings-front". On choisit **extension de `users-front`** car :
- Settings = user-centric, cohérent avec Profil/Auth/Users déjà dans `users-front`.
- Pas de fragmentation supplémentaire pour 3 sections.
- Pas de risque lockfile.

### D2. Structure des composants (composition simple, pas de WarpDrive)
3 composants section dans `@libs/users-front/src/components/settings/` :
1. **`SettingsProfileSection`** : form édition profil. Charge `currentUser` via service, PATCH sur submit. Class component avec `@tracked` fields.
2. **`SettingsNotificationsSection`** : 3 toggles. Charge prefs depuis mock `GET /api/v1/users/:id/notifications`, PATCH au toggle (debounced ou immediate). Class component avec `@tracked` notifs.
3. **`SettingsSecuritySection`** : form change password. 3 inputs + validation côté front (8 char min, confirmation match). POST `/api/v1/users/:id/change-password` (mock). Class component avec validation.

### D3. Mocks MSW étendus
`@libs/users-front/src/http-mocks/users.ts` — ajouter :
- **`GET /api/v1/users/:id/notifications`** → retourne `{ data: { id, type: 'user-notifications', attributes: { email: true, assignedTasks: true, weeklyDigest: false } } }`.
- **`PATCH /api/v1/users/:id/notifications`** → accepte le body, persiste en-mémoire (map locale `notificationsByUserId`), retourne le payload mis à jour.
- **`POST /api/v1/users/:id/change-password`** → valide :
  - `currentPassword` requis (n'importe quel string non-vide passe en mock — pas de hash check).
  - `newPassword` ≥ 8 chars.
  - Retourne `200 { data: { success: true } }` ou `400 { errors: [{ status: '400', code: 'INVALID_PASSWORD', detail: '...' }] }`.

### D4. Service `userPreferences` (ou méthodes ajoutées à UserService)
Décision : **étendre `UserService`** plutôt que créer un nouveau service.

`@libs/users-front/src/services/user.ts` — ajouter :
- `loadNotifications(userId): Promise<NotificationPreferences>` → fetch natif `/api/v1/users/:id/notifications`.
- `updateNotifications(userId, prefs): Promise<NotificationPreferences>` → PATCH `/api/v1/users/:id/notifications`.
- `changePassword(userId, payload: { currentPassword, newPassword }): Promise<void>` → POST `/api/v1/users/:id/change-password`. Throw `Error` avec message i18n-friendly si 400.

```typescript
export interface NotificationPreferences {
  email: boolean;
  assignedTasks: boolean;
  weeklyDigest: boolean;
}
```

### D5. Route + template settings (convention `routes/.../index-template.gts`)
**Création** :
- `@libs/users-front/src/routes/dashboard/settings/index.gts` (Route class — charge `currentUser` + `loadNotifications`)
- `@libs/users-front/src/routes/dashboard/settings/index-template.gts` (Template orchestrant les 3 sections)

**Retrait** :
- `@libs/shell-front/src/routes/dashboard/settings.ts`
- `@libs/shell-front/src/templates/dashboard/settings.gts`
- Note : la route `dashboard.settings` est déclarée dans `users-front/src/index.ts:authRoutes` ? Non — vérifier au scaffold. Plus probablement c'est dans shell-front router. Si oui, NE PAS retirer la déclaration, juste les fichiers de template/route.

**Conflit potentiel** : si `dashboard.settings` est une route "feuille" (sans sous-routes), `routes/dashboard/settings.gts` (single file) suffit. Si on garde la convention `index-template`, on aura `routes/dashboard/settings/index.gts` + `index-template.gts` → besoin de transformer la route en route nested (`this.route('settings', function () { ... })`). À évaluer au scaffold.

**Décision provisoire** : utiliser le pattern single-file simple (cohérent avec l'existant shell-front placeholder) — `routes/dashboard/settings.gts` (Route) + `routes/dashboard/settings-template.gts` (Template). Plus simple et match le placeholder actuel.

### D6. i18n
- Étendre `@apps/front/translations/users/{en-us,fr-fr}.yaml` avec namespace `settings.*` :
  - `settings.title`, `settings.subtitle`
  - `settings.profile.title`, `settings.profile.fields.firstName/lastName/email/role`, `settings.profile.actions.save`
  - `settings.notifications.title`, `settings.notifications.items.email/assignedTasks/weeklyDigest`
  - `settings.security.title`, `settings.security.fields.currentPassword/newPassword/confirmPassword`, `settings.security.actions.changePassword`
  - `settings.security.errors.passwordTooShort/passwordMismatch/currentPasswordWrong/serverError`
  - `settings.messages.profileSaved/notificationsSaved/passwordChanged`

Note : namespace `settings` au lieu de `users.settings` pour cohérence avec le folder `users/` (déjà namespace `users`). On crée `@apps/front/translations/settings/{en-us,fr-fr}.yaml` séparé pour bien isoler.

### D7. Validations Zod côté front
Réutiliser le pattern existant `@libs/users-front/src/components/forms/user-validation.ts` (Zod).

Créer `@libs/users-front/src/components/settings/password-validation.ts` :
```typescript
import { z } from 'zod';

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'settings.security.errors.currentPasswordRequired'),
  newPassword: z.string().min(8, 'settings.security.errors.passwordTooShort'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'settings.security.errors.passwordMismatch',
  path: ['confirmPassword'],
});
```

### D8. Tests (vitest + Ember test infra)
`@libs/users-front/tests/integration/settings/` (créer dossier) :
1. `settings-profile-section-test.gts` — render avec mock user → champs préfilled.
2. `settings-notifications-section-test.gts` — render avec prefs initiales → 3 toggles dans bon état.
3. `settings-security-section-test.gts` — validation : password < 8 → erreur, passwords different → erreur, valide → soumission.

Pretest déjà OK (`pretest: rollup -c`).

---

## 4. Plan d'exécution (sous-agents parallélisables)

**Vague 1 — Mocks + service + i18n (sériel)** (~15 min)
1. Étendre `http-mocks/users.ts` avec endpoints `notifications` + `change-password`.
2. Étendre `services/user.ts` avec `loadNotifications`, `updateNotifications`, `changePassword`.
3. Créer `@apps/front/translations/settings/{en-us,fr-fr}.yaml`.
4. Vérifier `@source "../../node_modules/@libs/users-front"` dans `app.css` (déjà OK).

**Vague 2 — Composants en parallèle (3 sous-agents)** (~20 min)
- Agent A : `SettingsProfileSection` (form édition + PATCH user + i18n + validation Zod réutilisant `user-validation`).
- Agent B : `SettingsNotificationsSection` (3 toggles + PATCH notifications + state tracked).
- Agent C : `SettingsSecuritySection` + `password-validation.ts` (Zod schema + form 3 inputs + POST change-password + erreurs UX).

**Vague 3 — Route + template (sériel)** (~10 min)
1. Créer `@libs/users-front/src/routes/dashboard/settings.gts` (Route — charge currentUser + notifications).
2. Créer `@libs/users-front/src/routes/dashboard/settings-template.gts` (compose les 3 sections + header).
3. Ajouter app-js entries dans `@libs/users-front/package.json`.
4. Supprimer placeholder `@libs/shell-front/src/routes/dashboard/settings.ts` + `templates/dashboard/settings.gts`.
5. **Vérifier** : la route `dashboard.settings` doit toujours être déclarée dans le router (shell-front ou users-front). Trouver et confirmer.

**Vague 4 — Tests + lint + visual (sériel)** (~20 min)
1. 3 tests intégration (vitest).
2. `pnpm turbo lint` depuis racine (`feedback-lint-before-push`).
3. Validation visuelle Playwright `/settings` vs `docs/figma-screenshots/09-settings.png` (utiliser **`.replace(/\s+/g, ' ')`** sur les assertions textContent multi-mots — cf. `feedback-prettier-text-tests`).

**Vague 5 — PR + handoff** (~10 min)
1. Commit `feat(users-front): P12 — Settings page (profile, notifications, security)`.
2. Push + PR vers `dev`.
3. **Pas de risque lockfile** (extension de lib existante).
4. Move plan to `specs/done/`.
5. `/TPK-handoff`.

**Total estimé** : 75 min.

---

## 5. Critères de succès (vérification bloquante avant `done/`)

1. [ ] Route `/settings` rend sans erreur (plus de placeholder shell-front).
2. [ ] Header `<h1>Paramètres</h1>` + sous-titre "Gérez vos préférences et votre compte" visibles.
3. [ ] **Section Profil** : 4 champs prefilled depuis `currentUser` (Prénom, Nom, Email, Rôle). Rôle est read-only/disabled.
4. [ ] Bouton "Sauvegarder" profil : appelle PATCH user, affiche message succès (toast OU inline) avec i18n.
5. [ ] **Section Notifications** : 3 toggles chargés depuis mock `GET /notifications` (email=true, assignedTasks=true, weeklyDigest=false).
6. [ ] Toggle un switch → PATCH notifications, persiste en-mémoire (re-charger la page → état conservé pendant la session).
7. [ ] **Section Sécurité** : 3 inputs (current/new/confirm). Validation front : new < 8 chars → erreur i18n. new !== confirm → erreur i18n.
8. [ ] Soumettre password valide → POST change-password, retour success → message succès affiché.
9. [ ] Soumettre password invalide (front rules) → erreurs inline visibles, pas de POST.
10. [ ] 3/3 tests intégration verts.
11. [ ] `pnpm turbo lint` vert depuis racine **avant push**.
12. [ ] Sidebar "Paramètres" navigue vers la page (ne pas régresser).
13. [ ] Validation visuelle Playwright : screenshot `specs/review-screenshots/p12-settings.png` capturé, comparable à `docs/figma-screenshots/09-settings.png`.
14. [ ] Zéro erreur console runtime (hors favicon 404 noise).

---

## 6. Key Files (anticipation)

### Nouveaux
- `@libs/users-front/src/components/settings/settings-profile-section.gts`
- `@libs/users-front/src/components/settings/settings-notifications-section.gts`
- `@libs/users-front/src/components/settings/settings-security-section.gts`
- `@libs/users-front/src/components/settings/password-validation.ts`
- `@libs/users-front/src/routes/dashboard/settings.gts` (Route)
- `@libs/users-front/src/routes/dashboard/settings-template.gts` (Template)
- `@libs/users-front/tests/integration/settings-profile-section-test.gts`
- `@libs/users-front/tests/integration/settings-notifications-section-test.gts`
- `@libs/users-front/tests/integration/settings-security-section-test.gts`
- `@apps/front/translations/settings/en-us.yaml`
- `@apps/front/translations/settings/fr-fr.yaml`

### Modifiés
- `@libs/users-front/src/http-mocks/users.ts` — ajout endpoints notifications + change-password
- `@libs/users-front/src/services/user.ts` — méthodes loadNotifications, updateNotifications, changePassword
- `@libs/users-front/package.json` — app-js entries pour les nouveaux fichiers
- `@apps/front/app/styles/app.css` — vérifier `@source` users-front (déjà OK)

### Supprimés
- `@libs/shell-front/src/routes/dashboard/settings.ts`
- `@libs/shell-front/src/templates/dashboard/settings.gts`

---

## 7. Risques connus & mitigations

| Risque | Mitigation |
|---|---|
| Route `dashboard.settings` déclarée comme feuille → conflict si on crée un dossier `settings/` | Utiliser le pattern single-file `settings.gts` + `settings-template.gts` (cohérent avec le placeholder actuel). Pas de nested folder. |
| Mock notifications volatile (perd state au reload page) | Accepté pour P12 ; documenter dans le commit que la persistance backend = P13. |
| `currentUser` peut être `null` au model() avant login | Route protégée (la sidebar n'est accessible qu'authentifié) — current-user est garanti chargé. Si null inattendu : fallback redirect login. |
| Backend ne valide pas `change-password` (mock seul) | OK pour P12, mock retourne 200 si validation front passe. P13 ajoutera la route backend réelle. |
| Tests `toContain('Mot de passe')` cassés par Prettier line-break | Utiliser `.replace(/\s+/g, ' ')` (cf. `feedback-prettier-text-tests`). |
| Pattern toggle non standardisé dans le projet | Utiliser `<input type="checkbox" class="toggle toggle-primary" />` daisyui — simple et stylé. |
| Conflict avec existing `user-form.gts` (admin CRUD) | Pas de conflit — `user-form.gts` reste utilisé pour `dashboard.users.create/edit`. P12 crée des composants distincts dans `components/settings/`. |
| Validation Zod côté backend pour change-password absente (mock seul) | Acceptable P12. P13 ajoutera le contrat réel. |

---

## 8. Mémoires à mettre à jour (post-P12)

- Aucune nouvelle mémoire prévue : P12 = extension lib existante avec patterns connus.
- Si découverte d'un problème spécifique à la validation Zod inline ou au toast pattern → potentielle nouvelle mémoire.
