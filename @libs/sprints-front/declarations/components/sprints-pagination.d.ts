import Component from '@glimmer/component';
interface SprintsPaginationSignature {
    Args: {
        offset: number;
        total: number;
        pageSize: number;
        onPrev: () => void;
        onNext: () => void;
    };
    Element: HTMLDivElement;
}
export default class SprintsPagination extends Component<SprintsPaginationSignature> {
    get from(): number;
    get to(): number;
    get prevDisabled(): boolean;
    get nextDisabled(): boolean;
    handlePrev(): void;
    handleNext(): void;
}
export {};
//# sourceMappingURL=sprints-pagination.d.ts.map