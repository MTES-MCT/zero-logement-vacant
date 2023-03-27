import React, { ReactElement } from 'react';
import { Text } from '@dataesr/react-dsfr';

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
  onChangeValue?: (value: string, isChecked: boolean) => void;
  size?: 'sm' | 'md';
}

export const DefaultOption: SelectOption = {
  label: 'Sélectionner',
  value: '',
  hidden: true,
};

export const Separator: SelectOption = {
  label: '',
  value: '',
  markup: () => <hr className="fr-mt-1w" />,
};

// We might have to transform options in components in the future,
// having all of them implement a single SelectOption interface

export function createSubtitleOption(label: string): SelectOption {
  return {
    label,
    value: '',
    markup: () => (
      <div>
        <Text as="span" bold size="md">
          {label}
        </Text>
        <hr className="fr-pb-1w" />
      </div>
    ),
  };
}
