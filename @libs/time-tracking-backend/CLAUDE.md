# time-tracking-backend — Add-on Time Tracking

Add-on **séparé** du bounded context Scrum. Time Tracking n'est pas prescrit par Scrum (qui gère les story points). Ce module est conçu pour être remplaçable (Toggl, Harvest...) sans impact sur `@libs/scrum-backend`.

## Entités

- `TimeEntry` : enregistrement d'heures travaillées sur une tâche, pour un utilisateur, un jour donné.

## FK cross-lib (string uniquement)

- `taskId` → `tasks.id` (scrum-backend)
- `userId` → `users.id` (users-backend)
- `projectId` → `projects.id` (scrum-backend) — dénormalisé pour les rapports

## Conventions

- PK : UUID v4 (`p.string().primary()`).
- Pas d'enum natif. Validation Zod côté API (P2).

## Code style

Enforcer `.oxlintrc.json` (oxlint + oxfmt).
