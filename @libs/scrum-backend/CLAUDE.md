# scrum-backend — Bounded context Scrum

Lib backend couvrant le **bounded context Scrum** : Project, Epic, UserStory, Task, Sprint et leurs child entities (ProjectMember, TaskAssignee, Comment, Attachment, HistoryEntry).

**Ne contient PAS** TimeEntry (dans `@libs/time-tracking-backend` — add-on séparé).

## Organisation interne

```
src/
├── project/          ProjectEntity + ProjectMemberEntity (aggregate root + child)
├── epic/             EpicEntity
├── user-story/       UserStoryEntity
├── task/             TaskEntity + TaskAssigneeEntity + CommentEntity + AttachmentEntity + HistoryEntryEntity
├── sprint/           SprintEntity
├── types.ts          Enums Zod (PROJECT_STATUSES, TASK_STATUSES, TASK_TYPES, etc.)
├── context.ts        ScrumLibraryContext (étendu en P2)
├── init.ts           ScrumModule (setupRoutes ajouté en P2)
└── index.ts          Re-exports + tableau entities
```

## FK cross-lib

Toutes les FK vers d'autres bounded contexts (`users-backend`) sont des **string IDs** (`userId`, `responsibleId`, etc.) — pas de relation MikroORM cross-lib. Le populate via repository se fait en P2.

## Conventions

- PK : UUID v4 (`p.string().primary()`), généré côté code.
- `Task.number` : entier unique par projet, implémenté applicativement en P2 (MAX + 1 dans une transaction). En dev : numéros explicites dans le seeder.
- Enums : colonne `string`, validés par Zod côté API (P2). Pas d'enum natif PostgreSQL.

## Code style

Enforcer `.oxlintrc.json` (oxlint + oxfmt).

## Tests

- **Unit** : tests/unit/ — round-trip entity sans DB.
- **Integration** : tests/integration/ (P2) — requiert Docker.
