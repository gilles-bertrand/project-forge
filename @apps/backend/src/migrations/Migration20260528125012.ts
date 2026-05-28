import { Migration } from "@mikro-orm/migrations";

export class Migration20260528125012 extends Migration {
  override up(): void | Promise<void> {
    this.addSql(
      `create table "attachments" ("id" varchar(255) not null, "task_id" varchar(255) null, "project_id" varchar(255) null, "name" varchar(255) not null, "url" varchar(255) not null, "mime_type" varchar(255) not null, "size_bytes" int not null, "uploaded_by_id" varchar(255) not null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "attachments_task_id_index" on "attachments" ("task_id");`);
    this.addSql(`create index "attachments_project_id_index" on "attachments" ("project_id");`);
    this.addSql(
      `create index "attachments_uploaded_by_id_index" on "attachments" ("uploaded_by_id");`,
    );

    this.addSql(
      `create table "comments" ("id" varchar(255) not null, "task_id" varchar(255) not null, "user_id" varchar(255) not null, "content" varchar(255) not null, "type" varchar(255) not null, "metadata" jsonb null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "comments_task_id_index" on "comments" ("task_id");`);
    this.addSql(`create index "comments_user_id_index" on "comments" ("user_id");`);

    this.addSql(
      `create table "epics" ("id" varchar(255) not null, "title" varchar(255) not null, "description" varchar(255) not null, "project_id" varchar(255) not null, "status" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "epics_project_id_index" on "epics" ("project_id");`);

    this.addSql(
      `create table "history_entries" ("id" varchar(255) not null, "owner_type" varchar(255) not null, "owner_id" varchar(255) not null, "type" varchar(255) not null, "description" varchar(255) not null, "user_id" varchar(255) not null, "metadata" jsonb null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "history_entries_owner_id_index" on "history_entries" ("owner_id");`);
    this.addSql(`create index "history_entries_user_id_index" on "history_entries" ("user_id");`);

    this.addSql(
      `create table "projects" ("id" varchar(255) not null, "name" varchar(255) not null, "description" varchar(255) not null, "status" varchar(255) not null, "avatar" varchar(255) null, "github_url" varchar(255) null, "responsible_id" varchar(255) not null, "created_by_id" varchar(255) not null, "sprint_duration_days" int not null default 14, "default_velocity_points" int not null default 20, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "projects_responsible_id_index" on "projects" ("responsible_id");`);
    this.addSql(`create index "projects_created_by_id_index" on "projects" ("created_by_id");`);

    this.addSql(
      `create table "project_members" ("id" varchar(255) not null, "project_id" varchar(255) not null, "user_id" varchar(255) not null, "role" varchar(255) not null, "joined_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "project_members_project_id_index" on "project_members" ("project_id");`,
    );
    this.addSql(`create index "project_members_user_id_index" on "project_members" ("user_id");`);

    this.addSql(
      `create table "refresh_tokens" ("id" varchar(255) not null, "token_hash" varchar(255) not null, "user_id" varchar(255) not null, "device_info" varchar(255) null, "ip_address" varchar(255) null, "user_agent" varchar(255) null, "issued_at" date not null, "expires_at" date not null, "revoked_at" date null, "family_id" varchar(255) not null, primary key ("id"));`,
    );
    this.addSql(
      `create index "refresh_tokens_token_hash_index" on "refresh_tokens" ("token_hash");`,
    );
    this.addSql(`create index "refresh_tokens_user_id_index" on "refresh_tokens" ("user_id");`);
    this.addSql(
      `create index "refresh_tokens_expires_at_index" on "refresh_tokens" ("expires_at");`,
    );
    this.addSql(`create index "refresh_tokens_family_id_index" on "refresh_tokens" ("family_id");`);

    this.addSql(
      `create table "sprints" ("id" varchar(255) not null, "number" int not null, "name" varchar(255) not null, "goal" varchar(255) null, "project_id" varchar(255) not null, "start_date" timestamptz not null, "end_date" timestamptz not null, "status" varchar(255) not null, "velocity_points" int not null default 0, "completed_points" int not null default 0, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "sprints_number_index" on "sprints" ("number");`);
    this.addSql(`create index "sprints_project_id_index" on "sprints" ("project_id");`);

    this.addSql(
      `create table "tasks" ("id" varchar(255) not null, "number" int not null, "title" varchar(255) not null, "description" varchar(255) not null, "status" varchar(255) not null, "type" varchar(255) not null, "nature" varchar(255) not null, "priority" varchar(255) not null, "points" int not null, "estimated_hours" real null, "project_id" varchar(255) not null, "user_story_id" varchar(255) null, "epic_id" varchar(255) null, "sprint_id" varchar(255) null, "created_by_id" varchar(255) not null, "due_date" timestamptz null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "tasks_number_index" on "tasks" ("number");`);
    this.addSql(`create index "tasks_project_id_index" on "tasks" ("project_id");`);
    this.addSql(`create index "tasks_user_story_id_index" on "tasks" ("user_story_id");`);
    this.addSql(`create index "tasks_epic_id_index" on "tasks" ("epic_id");`);
    this.addSql(`create index "tasks_sprint_id_index" on "tasks" ("sprint_id");`);
    this.addSql(`create index "tasks_created_by_id_index" on "tasks" ("created_by_id");`);

    this.addSql(
      `create table "task_assignees" ("id" varchar(255) not null, "task_id" varchar(255) not null, "user_id" varchar(255) not null, "assigned_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "task_assignees_task_id_index" on "task_assignees" ("task_id");`);
    this.addSql(`create index "task_assignees_user_id_index" on "task_assignees" ("user_id");`);

    this.addSql(
      `create table "time_entries" ("id" varchar(255) not null, "task_id" varchar(255) not null, "user_id" varchar(255) not null, "project_id" varchar(255) not null, "hours" real not null, "date" timestamptz not null, "description" varchar(255) null, "created_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "time_entries_task_id_index" on "time_entries" ("task_id");`);
    this.addSql(`create index "time_entries_user_id_index" on "time_entries" ("user_id");`);
    this.addSql(`create index "time_entries_project_id_index" on "time_entries" ("project_id");`);

    this.addSql(
      `create table "user" ("id" varchar(255) not null, "email" varchar(255) not null, "first_name" varchar(255) not null, "last_name" varchar(255) not null, "password" varchar(255) not null, "role" varchar(255) not null, "color" varchar(255) not null, "avatar" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);

    this.addSql(
      `create table "user_stories" ("id" varchar(255) not null, "title" varchar(255) not null, "description" varchar(255) not null, "project_id" varchar(255) not null, "epic_id" varchar(255) null, "sprint_id" varchar(255) null, "status" varchar(255) not null, "points" int not null, "priority" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`,
    );
    this.addSql(`create index "user_stories_project_id_index" on "user_stories" ("project_id");`);
    this.addSql(`create index "user_stories_epic_id_index" on "user_stories" ("epic_id");`);
    this.addSql(`create index "user_stories_sprint_id_index" on "user_stories" ("sprint_id");`);
  }
}
