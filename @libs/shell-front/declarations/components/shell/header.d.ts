import Component from '@glimmer/component';
import { type SearchResult } from './search-dropdown';
import { type AddItemType } from './add-item-modal';
import type RouterService from '@ember/routing/router-service';
import type AddItemRouterService from '@libs/shared-front/services/add-item-router';
interface ShellHeaderSignature {
    Args: {
        projects?: {
            id: string;
            name: string;
        }[];
        onSidebarToggle?: () => void;
    };
}
export default class ShellHeader extends Component<ShellHeaderSignature> {
    router: RouterService;
    addItemRouter: AddItemRouterService;
    searchQuery: string;
    showSearchDropdown: boolean;
    showAddItemModal: boolean;
    navigateToTimeTracking(): void;
    onSearchInput(_e: Event, value: string): void;
    closeSearch(): void;
    onSearchResultSelect(item: SearchResult): void;
    openAddItem(): void;
    closeAddItem(): void;
    onAddItemSelect(type: AddItemType): void;
    handleSidebarToggle(): void;
}
export {};
//# sourceMappingURL=header.d.ts.map