import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import Component from '@glimmer/component';
import type { TOC } from '@ember/component/template-only';
import TpkSidebar from '@triptyk/ember-ui/components/prefabs/tpk-sidebar';
import TpkThemeSelector from '@triptyk/ember-ui/components/prefabs/tpk-theme-selector';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type SessionService from 'ember-simple-auth/services/session';
import ShellHeader from './header.gts';

type SidebarItem =
  | {
      type: 'link';
      label: string;
      route?: string;
      icon?: TOC<{ Element: SVGSVGElement }>;
      tooltip?: string;
    }
  | {
      type: 'group';
      label: string;
      isOpen?: boolean;
      icon?: TOC<{ Element: SVGSVGElement }>;
      items: SidebarItem[];
    };

// Inline SVG icon components (TOC pattern)
const DashboardIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block size-4 stroke-current">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
</template>;

const FolderIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block size-4 stroke-current">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
</template>;

const ListIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block size-4 stroke-current">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
</template>;

const KanbanIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block size-4 stroke-current">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
</template>;

const GitBranchIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block size-4 stroke-current">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 3v12m0 0a3 3 0 100 6 3 3 0 000-6zm0 0c3.314 0 6-2.686 6-6m6-6a3 3 0 100 6 3 3 0 000-6zm0 6v6" />
  </svg>
</template>;

const TargetIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block size-4 stroke-current">
    <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
    <circle cx="12" cy="12" r="6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
    <circle cx="12" cy="12" r="2" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
  </svg>
</template>;

const ClockIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block size-4 stroke-current">
    <circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2" />
  </svg>
</template>;

const UsersIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block size-4 stroke-current">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
</template>;

const SettingsIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block size-4 stroke-current">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
</template>;

export interface ShellLayoutSignature {
  Args: { projects?: { id: string; name: string }[] };
  Blocks: { default: [] };
  Element: HTMLDivElement;
}

export default class ShellLayout extends Component<ShellLayoutSignature> {
  @service declare currentUser: CurrentUserService;
  @service declare session: SessionService;
  @tracked sidebarCollapsed = false;

  get themeOptions() {
    return ['sprintforge-dark', 'sprintforge-light'];
  }

  get userForNav() {
    const u = this.currentUser.currentUser;
    if (!u) return { fullName: '', role: '' };
    return {
      fullName: `${u.firstName} ${u.lastName}`,
      role: u.role ?? '',
    };
  }

  get menuItems(): SidebarItem[] {
    return [
      {
        type: 'group',
        label: 'Navigation',
        isOpen: true,
        items: [
          { type: 'link', label: 'Tableau de bord', route: 'dashboard.index', icon: DashboardIcon },
          { type: 'link', label: 'Projets', route: 'dashboard.projects', icon: FolderIcon },
          { type: 'link', label: 'Backlog', route: 'dashboard.backlog', icon: ListIcon },
          { type: 'link', label: 'Kanban', route: 'dashboard.kanban', icon: KanbanIcon },
          { type: 'link', label: 'User Story Map', route: 'dashboard.user-story-map', icon: GitBranchIcon },
          { type: 'link', label: 'Sprints', route: 'dashboard.sprints', icon: TargetIcon },
          { type: 'link', label: 'Suivi du temps', route: 'dashboard.time-tracking', icon: ClockIcon },
        ],
      },
      {
        type: 'group',
        label: 'Administration',
        isOpen: true,
        items: [
          { type: 'link', label: 'Utilisateurs', route: 'dashboard.users', icon: UsersIcon },
          { type: 'link', label: 'Paramètres', route: 'dashboard.settings', icon: SettingsIcon },
        ],
      },
    ];
  }

  @action logout() {
    return this.session.invalidate();
  }

  @action setCollapsed(v: boolean) {
    this.sidebarCollapsed = v;
  }

  @action toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  <template>
    <div class="tpk-dashboard drawer lg:drawer-open">
      <input
        id="tpk-dashboard-drawer"
        type="checkbox"
        class="tpk-dashboard-drawer drawer-toggle"
      />
      <div class="tpk-dashboard-content drawer-content flex flex-col min-h-screen">
        <ShellHeader
          @projects={{@projects}}
          @onSidebarToggle={{this.toggleSidebar}}
        />
        <main class="p-6 flex-1">
          {{yield}}
        </main>
      </div>
      <TpkSidebar
        @sidebarItems={{this.menuItems}}
        @drawerId="tpk-dashboard-drawer"
        @collapsed={{this.sidebarCollapsed}}
        @onCollapsedChange={{this.setCollapsed}}
      >
        <:header>
          <div class="px-6 py-4">
            <span class="text-lg font-bold" style="color: var(--primary)">
              SprintForge
            </span>
          </div>
        </:header>
        <:footer>
          {{#if this.userForNav.fullName}}
            <div
              class="flex items-center gap-3 px-4 py-3 border-t border-sidebar-border"
            >
              <div
                class="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-semibold shrink-0"
              >
                {{this.userInitials}}
              </div>
              {{#unless this.sidebarCollapsed}}
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium truncate">
                    {{this.userForNav.fullName}}
                  </div>
                  {{#if this.userForNav.role}}
                    <div class="text-xs opacity-60 truncate">
                      {{this.userForNav.role}}
                    </div>
                  {{/if}}
                </div>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs btn-square"
                  aria-label="Logout"
                  {{on "click" this.logout}}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    class="size-4 stroke-current"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              {{/unless}}
            </div>
          {{/if}}
          <TpkThemeSelector
            @localStorageKey="sprintforge:theme"
            @sidebarCollapsed={{this.sidebarCollapsed}}
            @themes={{this.themeOptions}}
          />
        </:footer>
      </TpkSidebar>
    </div>
  </template>

  get userInitials() {
    const u = this.currentUser.currentUser;
    if (!u) return '';
    const first = u.firstName?.[0] ?? '';
    const last = u.lastName?.[0] ?? '';
    return `${first}${last}`.toUpperCase();
  }
}
