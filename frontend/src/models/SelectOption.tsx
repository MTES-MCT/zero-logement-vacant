import { ReactElement } from 'react';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  hidden?: boolean;
  badgeLabel?: string;
  markup?: (props: SelectOptionProps) => ReactElement;
  hint?: ReactElement;
  icon?: string;
}

interface SelectOptionProps {
  key?: string;
  checked?: boolean;
  onChangeValue?: (value: string, isChecked: boolean) => void;
  small?: boolean;
}

export const DefaultOption: SelectOption = {
  label: 'Sélectionnez une valeur',
  value: '',
  hidden: true,
};

export const Separator: SelectOption = {
  label: '',
  value: '',
  markup: () => <hr className="fr-mt-1w" />,
};

export interface OptionTreeElement {
  title: string;
  elements: OptionTreeElement[] | string[];
}
