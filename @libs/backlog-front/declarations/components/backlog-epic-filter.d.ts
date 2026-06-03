import Component from '@glimmer/component';
import type { Epic } from '../schemas/epics.ts';
interface BacklogEpicFilterSignature {
    Element: HTMLDivElement;
    Args: {
        epics: Epic[];
        activeEpicId: string | null;
        onSelect: (epicId: string | null) => void;
    };
}
/**
 * Searchable epic filter dropdown. Scales to many epics: a trigger button
 * shows the active epic, the panel offers a search box plus a scrollable,
 * colour-dotted list. Controlled — the active epic is owned by the caller.
 */
export default class BacklogEpicFilter extends Component<BacklogEpicFilterSignature> {
    open: boolean;
    query: string;
    get activeEpic(): Epic | null;
    get activeDotStyle(): string;
    get filteredEpics(): Epic[];
    dotStyle: (epic: Epic) => string;
    toggle(): void;
    close(): void;
    onSearch(e: Event): void;
    select(epicId: string | null): void;
}
export {};
//# sourceMappingURL=backlog-epic-filter.d.ts.map