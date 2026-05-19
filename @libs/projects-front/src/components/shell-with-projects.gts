import Component from '@glimmer/component';
import { service } from '@ember/service';
import ShellLayout from '@libs/shell-front/components/shell/layout';
import type ProjectsService from '../services/projects.ts';

interface ShellWithProjectsSignature {
  Blocks: { default: [] };
  Element: HTMLDivElement;
}

export default class ShellWithProjects extends Component<ShellWithProjectsSignature> {
  @service declare projects: ProjectsService;

  get projectOptions(): { id: string; name: string }[] {
    return this.projects.list.map((p) => ({
      id: p.id ?? '',
      name: p.name,
    }));
  }

  <template>
    <ShellLayout @projects={{this.projectOptions}}>
      {{yield}}
    </ShellLayout>
  </template>
}
