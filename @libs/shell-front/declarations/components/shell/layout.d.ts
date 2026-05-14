import Component from '@glimmer/component';
import type { TOC } from '@ember/component/template-only';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type SessionService from 'ember-simple-auth/services/session';
type SidebarItem = {
    type: 'link';
    label: string;
    route?: string;
    icon?: TOC<{
        Element: SVGSVGElement;
    }>;
    tooltip?: string;
} | {
    type: 'group';
    label: string;
    isOpen?: boolean;
    icon?: TOC<{
        Element: SVGSVGElement;
    }>;
    items: SidebarItem[];
};
export interface ShellLayoutSignature {
    Args: {
        projects?: {
            id: string;
            name: string;
        }[];
    };
    Blocks: {
        default: [];
    };
    Element: HTMLDivElement;
}
export default class ShellLayout extends Component<ShellLayoutSignature> {
    currentUser: CurrentUserService;
    session: SessionService;
    sidebarCollapsed: boolean;
    get themeOptions(): string[];
    get userForNav(): {
        fullName: string;
    };
    get menuItems(): SidebarItem[];
    logout(): Promise<void>;
    setCollapsed(v: boolean): void;
    toggleSidebar(): void;
}
export {};
//# sourceMappingURL=layout.d.ts.map