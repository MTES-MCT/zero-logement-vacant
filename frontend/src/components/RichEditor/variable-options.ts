import { Variable } from './Variable';

export const VARIABLE_OPTIONS: Variable[] = [
  {
    label: 'Nom et prénom propriétaire principal',
    value: '{{owner.fullName}}',
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
    label: 'Référence cadastrale',
    value: '{{housing.cadastralReference}}',
  },
  {
    label: 'Type de logement',
    value: '{{housing.housingKind}}',
  },
  {
    label: 'Surface en m²',
    value: '{{housing.livingArea}}',
  },
  {
    label: 'Nombre de pièces',
    value: '{{housing.roomsCount}}',
  },
  {
    label: 'Date de construction',
    value: '{{housing.buildingYear}}',
  },
  {
    label: 'DPE',
    value: '{{housing.energyConsumption}}',
  }
];
