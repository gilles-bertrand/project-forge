import Component from "@glimmer/component";
import type Owner from "@ember/owner";
import type SprintsService from "../services/sprints.ts";
import type { BurndownData } from "../services/sprints.ts";
interface SprintBurndownModalSignature {
    Args: {
        sprintId: string;
        sprintName?: string;
        onClose: () => void;
    };
}
export default class SprintBurndownModal extends Component<SprintBurndownModalSignature> {
    sprints: SprintsService;
    data: BurndownData;
    loading: boolean;
    error: string;
    constructor(owner: Owner, args: SprintBurndownModalSignature["Args"]);
    load: () => Promise<void>;
    viewBox: string;
    get hasData(): boolean;
    get plotW(): number;
    get plotH(): number;
    get maxY(): number;
    private xFor;
    private yFor;
    get idealPoints(): string;
    get actualPoints(): string;
    get axisX0(): number;
    get axisX1(): number;
    get axisY0(): number;
    get axisY1(): number;
    get maxYLabel(): number;
    get firstDayLabel(): string;
    get lastDayLabel(): string;
    get currentRemaining(): number | null;
}
export {};
//# sourceMappingURL=sprint-burndown-modal.d.ts.map