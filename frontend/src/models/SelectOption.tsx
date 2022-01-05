export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
    hidden?: boolean;
}

export const DefaultOption: SelectOption = {value: '', label: 'Sélectionner', disabled: true, hidden: true}
