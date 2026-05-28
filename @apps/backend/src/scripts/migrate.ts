import {
  MikroORM,
  type AbstractSqlDriver,
  type Configuration,
  type IMigratorStorage,
} from "@mikro-orm/core";
import { Migration, Migrator, type MigrationRunner } from "@mikro-orm/migrations";
import * as fs from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

type Command = "up" | "down" | "fresh" | "list";
type Orm = MikroORM<AbstractSqlDriver>;
type Migrator = Orm["migrator"];

// Accès aux propriétés protected du Migrator : contourne le bug MikroORM 7.0.14
// où `migrator.up()` plante avec `MigrationClass is not a constructor` à cause
// de l'heuristique `Object.values(module).find(typeof cls.constructor === 'function')`
// qui échoue sur les namespaces ESM gelés retournés par vite-node.
interface MigratorInternals {
  runner: MigrationRunner;
  options: { path: string; glob?: string };
  storage: IMigratorStorage;
  driver: AbstractSqlDriver;
  config: Configuration;
}

function extractInternals(migrator: Migrator): MigratorInternals {
  return migrator as unknown as MigratorInternals;
}

async function instantiateMigration(migrationPath: string): Promise<Migration> {
  const url = pathToFileURL(resolve(migrationPath)).href;
  const module = (await import(url)) as Record<string, unknown>;

  const fromDefault = module.default as (new () => Migration) | undefined;
  if (fromDefault?.prototype instanceof Migration) {
    return new fromDefault();
  }

  const Candidate = Object.values(module).find(
    (v): v is new () => Migration =>
      typeof v === "function" && (v as { prototype?: unknown }).prototype instanceof Migration,
  );
  if (Candidate) return new Candidate();

  throw new Error(
    `No Migration subclass in ${migrationPath}. Found exports: [${Object.keys(module).join(", ")}]`,
  );
}

async function runUp(migrator: Migrator, orm: Orm): Promise<void> {
  const pending = await migrator.getPending();
  if (!pending.length) {
    console.log("✅ No pending migrations");
    return;
  }
  const { runner, options } = extractInternals(migrator);
  const dir = resolve(options.path ?? "./migrations");
  console.log(`UP ${pending.length} migrations`);

  await orm.em.transactional(async (em) => {
    const trx = em.getTransactionContext();
    runner.setMasterMigration(trx!);
    try {
      for (const info of pending) {
        const file = info.path ?? join(dir, info.name + ".ts");
        console.log(`  → ${info.name}`);
        const instance = await instantiateMigration(file);
        await runner.run(instance, "up");
        await migrator.getStorage().logMigration({ name: info.name });
      }
    } finally {
      runner.unsetMasterMigration();
    }
  });
  console.log("✅ Done");
}

async function runDown(migrator: Migrator, orm: Orm): Promise<void> {
  const executed = await migrator.getStorage().executed();
  if (!executed.length) {
    console.log("✅ Nothing to rollback");
    return;
  }
  const { runner, options } = extractInternals(migrator);
  const dir = resolve(options.path ?? "./migrations");
  const last = executed[executed.length - 1]!;
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".ts")).sort();
  const match = files.findLast((f) => last.startsWith(f.replace(".ts", "")));
  if (!match) throw new Error(`Migration file not found for ${last}`);

  console.log(`DOWN ${last}`);
  await orm.em.transactional(async (em) => {
    const trx = em.getTransactionContext();
    runner.setMasterMigration(trx!);
    try {
      const instance = await instantiateMigration(join(dir, match));
      await runner.run(instance, "down");
      await migrator.getStorage().unlogMigration({ name: last });
    } finally {
      runner.unsetMasterMigration();
    }
  });
  console.log("✅ Done");
}

async function runFresh(migrator: Migrator, orm: Orm): Promise<void> {
  const schemaGen = orm.getSchemaGenerator();
  console.log("Dropping schema…");
  await schemaGen.dropSchema({ dropMigrationsTable: true, wrap: false });
  console.log("Creating schema…");
  await schemaGen.createSchema({ wrap: false });
  await runUp(migrator, orm);
}

async function runList(migrator: Migrator): Promise<void> {
  const pending = await migrator.getPending();
  const executed = await migrator.getStorage().executed();
  console.log("=== Pending ===");
  if (!pending.length) console.log("  (none)");
  for (const p of pending) console.log(`  ${p.name}`);
  console.log("=== Executed ===");
  if (!executed.length) console.log("  (none)");
  for (const name of executed) console.log(`  ${name}`);
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;
  if (!command || !["up", "down", "fresh", "list"].includes(command)) {
    console.error("Usage: vite-node src/scripts/migrate.ts <up|down|fresh|list>");
    process.exit(1);
  }

  // @ts-expect-error vite-node resolves .ts at runtime
  const config = (await import("../mikro-orm.config.ts")).default;
  const orm = await MikroORM.init<AbstractSqlDriver>(config);
  Migrator.register(orm);
  const migrator = orm.migrator;

  try {
    switch (command) {
      case "up":
        await runUp(migrator, orm);
        break;
      case "down":
        await runDown(migrator, orm);
        break;
      case "fresh":
        await runFresh(migrator, orm);
        break;
      case "list":
        await runList(migrator);
        break;
    }
  } finally {
    await orm.close(true);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
