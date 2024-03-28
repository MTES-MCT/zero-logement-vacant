import { SelectProps } from '@codegouvfr/react-dsfr/SelectNext';

import { VariableOption } from '../../../../shared/models/variable-options';

export const VARIABLE_OPTIONS: SelectProps.Option<VariableOption>[] = [
  {
    label: 'Nom et prénom propriétaire',
    value: '{{owner.fullName}}',
  },
];
