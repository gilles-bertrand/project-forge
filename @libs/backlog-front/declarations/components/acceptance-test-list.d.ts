import Component from '@glimmer/component';
import type Owner from '@ember/owner';
import type AcceptanceTestsService from '../services/acceptance-tests.ts';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { AcceptanceTest, AcceptanceTestState } from '../schemas/acceptance-tests.ts';
interface AcceptanceTestListSignature {
    Args: {
        ownerType: 'task' | 'user-story';
        ownerId: string;
    };
}
export default class AcceptanceTestList extends Component<AcceptanceTestListSignature> {
    acceptanceTests: AcceptanceTestsService;
    currentUser: CurrentUserService;
    items: AcceptanceTest[];
    loading: boolean;
    error: string;
    newName: string;
    submitting: boolean;
    constructor(owner: Owner, args: AcceptanceTestListSignature['Args']);
    load: () => Promise<void>;
    get isEmpty(): boolean;
    badgeClassFor: (state: AcceptanceTestState) => string;
    symbolFor: (state: AcceptanceTestState) => string;
    onNewNameInput(e: Event): void;
    cycleState(at: AcceptanceTest): Promise<void>;
    removeItem(at: AcceptanceTest): Promise<void>;
    add(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=acceptance-test-list.d.ts.map