import Component from '@glimmer/component';
export type KanbanFilterValue = 'all' | 'mine';
interface KanbanFiltersSignature {
    Args: {
        value: KanbanFilterValue;
        onChange: (value: KanbanFilterValue) => void;
    };
    Element: HTMLDivElement;
}
export default class KanbanFilters extends Component<KanbanFiltersSignature> {
    isSelected: (v: KanbanFilterValue) => boolean;
    selectAll(): void;
    selectMine(): void;
}
export {};
//# sourceMappingURL=kanban-filters.d.ts.map