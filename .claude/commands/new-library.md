---
description: Scaffold a new frontend or backend library following the project's boilerplate (V2 — guarded, validated)
argument-hint: <frontend|backend> <library-name>
model: sonnet
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# New Library V2

Scaffold a new library in `@libs/` for this monorepo.

## Arguments

`$ARGUMENTS` — `<frontend|backend> <library-name>`

- `kind` must be exactly `frontend` or `backend`. If missing or any other value, stop and ask.
- `library-name` must be kebab-case (e.g. `invoice`, `audit-log`). If missing or invalid, stop and ask.

## Workflow

### 1. Validate arguments

- If `kind` ∉ `{frontend, backend}`, stop and ask the user.
- If `library-name` is missing or not kebab-case, stop and ask the user.

### 2. Check for collision

For backend libraries, follow the code style rules in `@libs/CLAUDE.md` (read it before generating code).

### 3. Backend library boilerplate requirements

When scaffolding a **backend** library, the following must always be included :

**`package.json`** — imports section doit contenir les deux alias :
```json
"imports": {
  "#src/*": "./src/*",
  "#tests/*": "./tests/*"
}
```

**`tsconfig.json`** — paths doit inclure :
```json
"paths": {
  "#src/*": ["./src/*"],
  "#tests/*": ["./tests/*"]
}
```

**`tests/global-setup.ts`** — squelette testcontainer Postgres à créer :
```ts
import { entities } from "#src/index.js";
import { MikroORM } from "@mikro-orm/postgresql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container;
export async function setup() {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test_db").withUsername("test_user").withPassword("test_password").start();
  process.env.TEST_DATABASE_URL = container.getConnectionUri();
  const orm = await MikroORM.init({ entities, clientUrl: process.env.TEST_DATABASE_URL });
  await orm.schema.refresh();
  await orm.close();
}
export async function teardown() { await container?.stop(); }
```

**`tests/utils/setup-module.ts`** — squelette TestModule à créer (à adapter selon le module).

**`devDependencies`** à inclure : `@testcontainers/postgresql`, `jsonwebtoken`, `@types/jsonwebtoken`

## Verify

After scaffolding is complete, run `pnpm -F @libs/<library-name> lint:js` **exactly once**, then refactor every reported violation in a single pass. Do not re-run lint to confirm — fix from the single output. This keeps token usage bounded.

Do not commit unless asked.
