import Component from '@glimmer/component';

interface UserAvatarSignature {
  Args: {
    firstName: string;
    lastName: string;
    size?: 'sm' | 'md' | 'lg';
  };
}

class UserAvatar extends Component<UserAvatarSignature> {
  get initials(): string {
    return `${this.args.firstName[0]}${this.args.lastName[0]}`.toUpperCase();
  }

  get colorClass(): string {
    const colors = [
      'bg-teal-600',
      'bg-orange-500',
      'bg-purple-600',
      'bg-slate-600',
    ];
    const index =
      (this.args.firstName.charCodeAt(0) + this.args.lastName.charCodeAt(0)) %
      4;
    return colors[index]!;
  }

  get sizeClass(): string {
    switch (this.args.size) {
      case 'sm':
        return 'w-8 h-8 text-xs';
      case 'lg':
        return 'w-16 h-16 text-base';
      default:
        return 'w-12 h-12 text-sm';
    }
  }

  <template>
    <div
      class="{{this.sizeClass}}
        {{this.colorClass}}
        rounded-full flex items-center justify-center text-white font-semibold"
      aria-label="{{@firstName}} {{@lastName}}"
    >
      {{this.initials}}
    </div>
  </template>
}

export default UserAvatar;
