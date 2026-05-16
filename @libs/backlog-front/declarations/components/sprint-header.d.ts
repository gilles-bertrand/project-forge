import Component from '@glimmer/component';
import type { Sprint } from '../schemas/sprints.ts';
interface SprintHeaderSignature {
    Args: {
        sprint: Sprint;
        pointsCompleted: number;
        pointsTotal: number;
    };
    Element: HTMLDivElement;
}
export default class SprintHeader extends Component<SprintHeaderSignature> {
    get startLabel(): string;
    get endLabel(): string;
    get percentComplete(): number;
}
export {};
//# sourceMappingURL=sprint-header.d.ts.map