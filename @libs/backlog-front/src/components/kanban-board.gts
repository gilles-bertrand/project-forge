import Component from '@glimmer/component';
import KanbanColumn from './kanban-column.gts';
import type { Task, TaskStatus } from '../schemas/tasks.ts';

interface KanbanBoardSignature {
  Args: {
    tasks: Task[];
    onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
    onOpenTask?: (task: Task) => void;
  };
  Element: HTMLDivElement;
}

const STATUSES: TaskStatus[] = [
  'todo',
  'in-progress',
  'testing',
  'uat',
  'done',
];

export default class KanbanBoard extends Component<KanbanBoardSignature> {
  get tasksByStatus(): Record<TaskStatus, Task[]> {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      'in-progress': [],
      testing: [],
      uat: [],
      done: [],
    };
    for (const task of this.args.tasks) {
      map[task.status]?.push(task);
    }
    return map;
  }

  tasksFor = (status: TaskStatus): Task[] => this.tasksByStatus[status];

  <template>
    <div
      class="flex gap-4 overflow-x-auto pb-4"
      data-test-kanban-board
      ...attributes
    >
      {{#each STATUSES as |status|}}
        <KanbanColumn
          @status={{status}}
          @tasks={{this.tasksFor status}}
          @onMoveTask={{@onMoveTask}}
          @onOpenTask={{@onOpenTask}}
        />
      {{/each}}
    </div>
  </template>
}
