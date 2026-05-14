import Component from '@glimmer/component';
export type MemberLite = {
    id: string;
    firstName: string;
    lastName: string;
    color?: string | null;
};
declare function colorClassFor(id: string): string;
declare function initialsOf(m: MemberLite): string;
interface MemberAvatarStackSignature {
    Args: {
        members: MemberLite[];
        max?: number;
    };
}
export default class MemberAvatarStack extends Component<MemberAvatarStackSignature> {
    get max(): number;
    get visible(): MemberLite[];
    get extra(): number;
    initials: typeof initialsOf;
    colorClass: typeof colorClassFor;
}
export {};
//# sourceMappingURL=member-avatar-stack.d.ts.map