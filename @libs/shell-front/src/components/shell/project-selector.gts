import { service } from '@ember/service';
import Component from '@glimmer/component';
import { action } from '@ember/object';
import TpkSelect from '@triptyk/ember-input/components/tpk-select';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '../../services/current-project.ts';

type ProjectOption = { id: string; name: string };

export interface ProjectSelectorSignature {
  Args: { projects?: ProjectOption[] };
  Element: HTMLDivElement;
}

export default class ProjectSelector extends Component<ProjectSelectorSignature> {
  @service declare currentProject: CurrentProjectService;
  @service declare router: RouterService;

  get options(): ProjectOption[] {
    return this.args.projects ?? [];
  }

  get selected(): ProjectOption | undefined {
    return this.options.find((p) => p.id === this.currentProject.currentProjectId);
  }

  @action onChange(selection: unknown) {
    const option = selection as ProjectOption | null;
    if (option) {
      this.currentProject.setCurrent(option.id);
    } else {
      this.currentProject.clear();
    }
    void this.router.refresh();
  }

  <template>
    <TpkSelect
      @label="Projet"
      @placeholder="Sélectionner un projet"
      @options={{this.options}}
      @selected={{this.selected}}
      @allowClear={{true}}
      @searchEnabled={{true}}
      @searchPlaceholder="Rechercher un projet…"
      @onChange={{this.onChange}}
      @renderInPlace={{false}}
      as |s|
    >
      <s.Option as |o|>{{o.option.name}}</s.Option>
    </TpkSelect>
  </template>
}
