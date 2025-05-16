import { isInactiveOwnerRank } from '@zerologementvacant/models';

import { useFindOwnersByHousingQuery } from '../../services/owner.service';
import OwnerList from './OwnerList';

export interface InactiveOwnerListProps {
  housingId: string;
}

function InactiveOwnerList(props: InactiveOwnerListProps) {
  const { data: housingOwners, isLoading } = useFindOwnersByHousingQuery(
    props.housingId
  );

  const inactiveOwners =
    housingOwners?.filter((owner) => isInactiveOwnerRank(owner.rank)) ?? [];

  return (
    <OwnerList
      isLoading={isLoading}
      owners={inactiveOwners}
      title={`Propriétaires archivés (${inactiveOwners.length})`}
    />
  );
}

export default InactiveOwnerList;
