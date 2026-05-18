import Component from '@glimmer/component';
export type AddItemType = 'project' | 'epic' | 'user-story' | 'task' | 'sprint' | 'time-entry';
interface AddItemModalSignature {
    Args: {
        onClose: () => void;
        onSelect: (type: AddItemType) => void;
    };
}
export default class AddItemModal extends Component<AddItemModalSignature> {
    select(type: AddItemType): void;
}
export {};
//# sourceMappingURL=add-item-modal.d.ts.map