/**
 * Temporary fix for the DSFR has not the types in sync with the implementation.
 * A pull request will be opened on their repository to fix this issue.
 */

import { Checkbox as DSFRCheckbox } from '@dataesr/react-dsfr';
import React, { ComponentPropsWithoutRef } from 'react';

interface CheckboxProps extends ComponentPropsWithoutRef<typeof DSFRCheckbox> {
  checked?: boolean;
  onChange?: React.ChangeEventHandler;
  value?: string;
}

const Checkbox: React.FC<CheckboxProps> = (props) => {
  return <DSFRCheckbox {...props} />;
};

export default Checkbox;
