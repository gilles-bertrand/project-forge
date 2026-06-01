import Component from '@glimmer/component';
export type MemberLite = {
    id: string;
    firstName: string;
    lastName: string;
    color?: string | null;
};
declare function colorClassFor(id: string): string;
declare function initialsOf(m: MemberLite): string;
declare function fullNameOf(m: MemberLite): string;
interface AssigneeAvatarStackSignature {
    Args: {
        members: MemberLite[];
        max?: number;
        moreLabel?: string;
    };
    Element: HTMLDivElement;
}
export default class AssigneeAvatarStack extends Component<AssigneeAvatarStackSignature> {
    get max(): number;
    get visible(): MemberLite[];
    get extra(): number;
    initials: typeof initialsOf;
    colorClass: typeof colorClassFor;
    fullName: typeof fullNameOf;
}
export {};
//# sourceMappingURL=assignee-avatar-stack.d.ts.map