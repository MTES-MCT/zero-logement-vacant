export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
    hidden?: boolean;
    separator?: boolean;
    badgeLabel?: string;
}

export const DefaultOption: SelectOption = {value: '', label: 'Sélectionner', disabled: true, hidden: true}

export const Separator: SelectOption = { value: '', label: '', disabled: true, hidden: true, separator: true }
