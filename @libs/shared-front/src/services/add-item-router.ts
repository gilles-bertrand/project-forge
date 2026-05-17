import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export type AddItemType =
  | 'project'
  | 'epic'
  | 'user-story'
  | 'task'
  | 'sprint'
  | 'time-entry';

export interface AddItemContext {
  preselectedEpicId?: string | null;
  preselectedUserStoryId?: string | null;
}

export default class AddItemRouterService extends Service {
  @tracked openType: AddItemType | null = null;
  @tracked context: AddItemContext = {};

  open = (type: AddItemType, context: AddItemContext = {}) => {
    this.context = context;
    this.openType = type;
  };

  close = () => {
    this.openType = null;
    this.context = {};
  };
}
