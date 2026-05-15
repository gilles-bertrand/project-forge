import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type UserStoriesService from '../services/user-stories.ts';
import type EpicsService from '../services/epics.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { StoryStatus, StoryPoints } from '../schemas/user-stories.ts';
interface AddUserStoryModalSignature {
    Args: {
        onClose: () => void;
        preselectedEpicId?: string | null;
    };
}
export default class AddUserStoryModal extends Component<AddUserStoryModalSignature> {
    userStories: UserStoriesService;
    epics: EpicsService;
    currentProject: CurrentProjectService;
    intl: IntlService;
    title: string;
    description: string;
    status: StoryStatus;
    epicId: string | null;
    points: StoryPoints;
    priority: number;
    submitting: boolean;
    error: string;
    get statusOptions(): {
        value: StoryStatus;
        label: string;
    }[];
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    isStatusSelected: (v: StoryStatus) => boolean;
    isPointSelected: (v: StoryPoints) => boolean;
    isEpicSelected: (id: string | null) => boolean;
    onTitleInput(e: Event): void;
    onDescriptionInput(e: Event): void;
    onStatusChange(e: Event): void;
    onEpicChange(e: Event): void;
    onPointsChange(e: Event): void;
    onPriorityInput(e: Event): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=add-user-story-modal.d.ts.map