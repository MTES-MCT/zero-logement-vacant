import {
  DECEASED_OWNER_RANK,
  INCORRECT_OWNER_RANK,
  PREVIOUS_OWNER_RANK
} from '@zerologementvacant/models';
import { match } from 'ts-pattern';

import AppSelectNext, {
  type AppSelectNextProps
} from '~/components/_app/AppSelect/AppSelectNext';

const INACTIVE_RANKS = [
  DECEASED_OWNER_RANK,
  INCORRECT_OWNER_RANK,
  PREVIOUS_OWNER_RANK
] as const;

type InactiveOwnerRank = (typeof INACTIVE_RANKS)[number];

export type HousingOwnerInactiveSelectProps<Multiple extends boolean> = Pick<
  AppSelectNextProps<InactiveOwnerRank, Multiple>,
  'className' | 'disabled' | 'error' | 'multiple' | 'value' | 'onChange'
>;

function HousingOwnerInactiveSelect<Multiple extends boolean = false>(
  props: HousingOwnerInactiveSelectProps<Multiple>
) {
  function getLabel(rank: InactiveOwnerRank): string {
    return match(rank)
      .with(DECEASED_OWNER_RANK, () => 'Propriétaire décédé')
      .with(INCORRECT_OWNER_RANK, () => 'Propriétaire incorrect')
      .with(PREVIOUS_OWNER_RANK, () => 'Ancien propriétaire')
      .exhaustive();
  }

  return (
    <AppSelectNext
      {...props}
      options={INACTIVE_RANKS}
      label="État du propriétaire"
      getOptionLabel={getLabel}
    />
  );
}

export default HousingOwnerInactiveSelect;
