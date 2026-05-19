import Component from '@glimmer/component';
export interface SearchResult {
    id: string;
    type: 'projects' | 'tasks' | 'user-stories' | 'sprints';
    attributes: {
        name?: string;
        title?: string;
        number?: number;
    };
}
interface SearchDropdownSignature {
    Args: {
        query: string;
        onSelect: (item: SearchResult) => void;
        onClose: () => void;
    };
}
export default class SearchDropdown extends Component<SearchDropdownSignature> {
    results: SearchResult[];
    loading: boolean;
    lastQuery: string;
    private _debounceTimer;
    get effectiveQuery(): string;
    get hasResults(): boolean;
    get queryLongEnough(): boolean;
    get groupedResults(): Array<{
        type: string;
        items: SearchResult[];
    }>;
    getLabel(item: SearchResult): string;
    private fetchResults;
}
export {};
//# sourceMappingURL=search-dropdown.d.ts.map