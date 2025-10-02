import { isSecondaryOwner } from '@zerologementvacant/models';

import { useFindOwnersByHousingQuery } from '../../services/owner.service';
import OwnerList from './OwnerList';

export interface SecondaryOwnerListProps {
  housingId: string;
}

/**
 * @deprecated Use {@link SecondaryOwnerListNext} instead.
 * @param props
 * @returns 
 */
function SecondaryOwnerList(props: SecondaryOwnerListProps) {
  const { data: housingOwners, isLoading } = useFindOwnersByHousingQuery(
    props.housingId
  );

  const secondaryOwners = housingOwners?.filter(isSecondaryOwner) ?? [];

  return (
    <OwnerList
      isLoading={isLoading}
      owners={secondaryOwners}
      title={`Propriétaires secondaires (${secondaryOwners.length})`}
    />
  );
}

export default SecondaryOwnerList;
