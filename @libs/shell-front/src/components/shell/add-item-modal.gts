import Component from '@glimmer/component';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { t } from 'ember-intl';

export type AddItemType = 'project' | 'epic' | 'user-story' | 'task' | 'sprint' | 'time-entry';

interface AddItemModalSignature {
  Args: {
    onClose: () => void;
    onSelect: (type: AddItemType) => void;
  };
}

export default class AddItemModal extends Component<AddItemModalSignature> {
  @action select(type: AddItemType) {
    this.args.onSelect(type);
  }

  <template>
    <dialog class="modal modal-open" data-test-add-item-modal>
      <div class="modal-box max-w-lg bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t "shell.addItem.title"}}</h3>
          <button type="button" class="btn btn-sm btn-circle btn-ghost" aria-label="Fermer" {{on "click" @onClose}}>✕</button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button type="button" class="btn btn-outline h-20 flex flex-col gap-1" {{on "click" (fn this.select "project")}}>
            <span class="text-2xl">📁</span><span>{{t "shell.addItem.project"}}</span>
          </button>
          <button type="button" class="btn btn-outline h-20 flex flex-col gap-1" {{on "click" (fn this.select "epic")}}>
            <span class="text-2xl">🎯</span><span>{{t "shell.addItem.epic"}}</span>
          </button>
          <button type="button" class="btn btn-outline h-20 flex flex-col gap-1" {{on "click" (fn this.select "user-story")}}>
            <span class="text-2xl">📋</span><span>{{t "shell.addItem.user-story"}}</span>
          </button>
          <button type="button" class="btn btn-outline h-20 flex flex-col gap-1" {{on "click" (fn this.select "task")}}>
            <span class="text-2xl">✅</span><span>{{t "shell.addItem.task"}}</span>
          </button>
          <button type="button" class="btn btn-outline h-20 flex flex-col gap-1" {{on "click" (fn this.select "sprint")}}>
            <span class="text-2xl">🏃</span><span>{{t "shell.addItem.sprint"}}</span>
          </button>
          <button type="button" class="btn btn-outline h-20 flex flex-col gap-1" {{on "click" (fn this.select "time-entry")}}>
            <span class="text-2xl">⏱</span><span>{{t "shell.addItem.time-entry"}}</span>
          </button>
        </div>
        <div class="modal-action">
          <button type="button" class="btn" {{on "click" @onClose}}>Annuler</button>
        </div>
      </div>
      <button type="button" class="modal-backdrop" {{on "click" @onClose}}></button>
    </dialog>
  </template>
}
