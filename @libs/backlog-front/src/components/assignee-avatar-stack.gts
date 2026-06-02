import Component from '@glimmer/component';

// Type local (backlog-front ne dépend pas de projects-front : règle inter-libs).
// Structurellement compatible avec le MemberLite de projects-front.
export type MemberLite = {
  id: string;
  firstName: string;
  lastName: string;
  color?: string | null;
};

const COLORS = [
  'bg-primary text-primary-content',
  'bg-secondary text-secondary-content',
  'bg-accent text-accent-content',
  'bg-info text-info-content',
  'bg-warning text-warning-content',
];

function colorClassFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

function initialsOf(m: MemberLite): string {
  return `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase();
}

function fullNameOf(m: MemberLite): string {
  return `${m.firstName} ${m.lastName}`;
}

interface AssigneeAvatarStackSignature {
  Args: {
    members: MemberLite[];
    max?: number;
    moreLabel?: string;
  };
  Element: HTMLDivElement;
}

export default class AssigneeAvatarStack extends Component<AssigneeAvatarStackSignature> {
  get max(): number {
    return this.args.max ?? 3;
  }

  get visible(): MemberLite[] {
    return this.args.members.slice(0, this.max);
  }

  get extra(): number {
    return Math.max(0, this.args.members.length - this.max);
  }

  initials = initialsOf;
  colorClass = colorClassFor;
  fullName = fullNameOf;

  <template>
    <div class="flex -space-x-2" data-test-assignee-avatar-stack ...attributes>
      {{#each this.visible as |m|}}
        <div class="tooltip tooltip-top" data-tip={{this.fullName m}}>
          <div
            class="avatar avatar-placeholder"
            data-test-assignee-avatar={{m.id}}
          >
            <div
              class="w-7 rounded-full ring-2 ring-base-200
                {{this.colorClass m.id}}"
            >
              <span class="text-xs font-semibold">{{this.initials m}}</span>
            </div>
          </div>
        </div>
      {{/each}}
      {{#if this.extra}}
        <div class="tooltip tooltip-top" data-tip={{@moreLabel}}>
          <div class="avatar avatar-placeholder" data-test-assignee-avatar-more>
            <div
              class="bg-neutral text-neutral-content w-7 rounded-full ring-2 ring-base-200"
            >
              <span class="text-xs">+{{this.extra}}</span>
            </div>
          </div>
        </div>
      {{/if}}
    </div>
  </template>
}
