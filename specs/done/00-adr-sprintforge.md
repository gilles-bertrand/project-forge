# ADR 00 — Migration boilerplate → SprintForge

Date : 2026-05-13
Statut : Accepté
Contexte : cf. `specs/todo/sprintforge-migration-macro-plan.md`

## Décisions

1. **Suppression du domaine `todos`** (back + front). Aucune compatibilité ascendante requise (boilerplate jamais déployé).
2. **Granularité libs Scrum** : un lib par agrégat racine.
   - Backend : `projects-backend`, `backlog-backend` (Epic+UserStory+Task), `sprints-backend`, `time-tracking-backend`.
   - Frontend : `projects-front`, `backlog-front`, `kanban-front` (peut fusionner avec backlog-front), `sprints-front`, `time-tracking-front`, `dashboard-front`. Settings dans `users-front` (extension).
3. **Comments / Attachments / HistoryEntry** : tables internes à `backlog-backend` (pas de lib dédiée).
4. **Design tokens** : variables CSS hébergées dans `@libs/shared-front/src/styles/theme.css`, exposées à Tailwind v4 via `@theme inline`.
5. **Thème** : service `theme` dans `@libs/shared-front`, persistance `localStorage`, classe `.light` sur `<html>`.
6. **i18n** : 100 % FR au MVP. La mécanique `ember-intl` est conservée mais on ne traduit pas en EN avant V2.
7. **Auth** : on conserve le mécanisme JWT + refresh existant (`@libs/users-backend`).

## Conséquences
- Pas de données historiques à porter : seeds totalement réécrits en P1.
- Tout consommateur Tailwind doit utiliser les classes générées depuis les tokens (`bg-card`, `text-foreground`, etc.) plutôt que les couleurs daisyUI pour les composants SprintForge.
