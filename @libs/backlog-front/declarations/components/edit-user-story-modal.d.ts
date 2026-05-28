import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type Owner from '@ember/owner';
import type UserStoriesService from '../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { UserStory, StoryStatus, StoryPoints } from '../schemas/user-stories.ts';
interface EditUserStoryModalSignature {
    Args: {
        userStory: UserStory;
        onClose: () => void;
    };
}
export default class EditUserStoryModal extends Component<EditUserStoryModalSignature> {
    userStories: UserStoriesService;
    currentProject: CurrentProjectService;
    intl: IntlService;
    title: string;
    description: string;
    status: StoryStatus;
    points: StoryPoints | null;
    priority: number;
    submitting: boolean;
    error: string;
    constructor(owner: Owner, args: EditUserStoryModalSignature['Args']);
    pointOptionValue: (v: StoryPoints | null) => string;
    get statusOptions(): {
        value: StoryStatus;
        label: string;
    }[];
    get pointOptions(): {
        value: StoryPoints | null;
        label: string;
    }[];
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    isStatusSelected: (v: StoryStatus) => boolean;
    isPointSelected: (v: StoryPoints | null) => boolean;
    onTitleInput(e: Event): void;
    onDescriptionInput(e: Event): void;
    onStatusChange(e: Event): void;
    onPointsChange(e: Event): void;
    onPriorityInput(e: Event): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=edit-user-story-modal.d.ts.map