import { ReactElement, ReactNode } from 'react';

export interface SelectOption<Value extends string | null = string> {
  label: string;
  value: Value;
  disabled?: boolean;
  hidden?: boolean;
  badgeLabel?: string;
  markup?: (props: SelectOptionProps<Value>) => ReactElement;
  hint?: ReactNode;
  icon?: string;
}

interface SelectOptionProps<Value extends string | null> {
  key?: string;
  checked?: boolean;
  onChangeValue?: (value: Value, isChecked: boolean) => void;
  small?: boolean;
}

export const DefaultOption: SelectOption = {
  label: 'Sélectionnez une valeur',
  value: '',
  hidden: true
};

export const Separator: SelectOption = {
  label: '',
  value: '',
  markup: () => <hr className="fr-mt-1w" />
};

export interface OptionTreeElement {
  title: string;
  elements: OptionTreeElement[] | string[];
}
