import { Migration } from '@mikro-orm/migrations';

export class Migration20260601081449 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "acceptance_tests" add "task_id" varchar(255) null;`);
    this.addSql(`alter table "acceptance_tests" alter column "user_story_id" drop not null;`);
    this.addSql(`create index "acceptance_tests_task_id_index" on "acceptance_tests" ("task_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "acceptance_tests_task_id_index";`);
    this.addSql(`alter table "acceptance_tests" drop column "task_id";`);
    this.addSql(`alter table "acceptance_tests" alter column "user_story_id" set not null;`);
  }

}
