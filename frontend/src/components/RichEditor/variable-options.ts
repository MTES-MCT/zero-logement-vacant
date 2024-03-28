import { SelectProps } from '@codegouvfr/react-dsfr/SelectNext';

import { VariableOption } from '../../../../shared/models/variable-options';

export const VARIABLE_OPTIONS: SelectProps.Option<VariableOption>[] = [
  {
    label: 'Nom et prénom propriétaire',
    value: '{{owner.fullName}}',
  },
  {
    label: 'Adresse propriétaire',
    value: '{{owner.rawAddress}}',
  },
  {
    label: 'Complément d’adresse propriétaire',
    value: '{{owner.additionalAddress}}',
  },
  {
    label: 'Adresse BAN logement',
    value: '{{housing.rawAddress}}',
  },
  {
    label: 'Identifiant logement',
    value: '{{housing.localId}}',
  },
  {
    label: 'Code INSEE',
    value: '{{housing.geoCode}}',
  },
];
