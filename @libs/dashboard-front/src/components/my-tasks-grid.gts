import type { TOC } from '@ember/component/template-only';
import { t } from 'ember-intl';
import TaskCard from '@libs/backlog-front/components/task-card';
import type { Task } from '@libs/backlog-front/schemas/tasks';

interface MyTasksGridSignature {
  Args: {
    tasks: Task[];
  };
}

const MyTasksGrid: TOC<MyTasksGridSignature> = <template>
  {{#if @tasks.length}}
    <div class="grid grid-cols-3 gap-4">
      {{#each @tasks as |task|}}
        <TaskCard @task={{task}} @variant="kanban" />
      {{/each}}
    </div>
  {{else}}
    <p data-test-empty class="opacity-60 italic">{{t "dashboard.noSprintTasks"}}</p>
  {{/if}}
</template>;

export default MyTasksGrid;
