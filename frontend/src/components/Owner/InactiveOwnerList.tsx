import Accordion from '@codegouvfr/react-dsfr/Accordion';
import { isInactiveOwnerRank } from '@zerologementvacant/models';

import OwnerList from '~/components/Owner/OwnerList';

import { useFindOwnersByHousingQuery } from '../../services/owner.service';

export interface InactiveOwnerListProps {
  housingId: string;
}

function InactiveOwnerList(props: InactiveOwnerListProps) {
  const {
    data: housingOwners,
    isLoading,
    isSuccess
  } = useFindOwnersByHousingQuery(props.housingId);

  const inactiveOwners =
    housingOwners?.filter((owner) => isInactiveOwnerRank(owner.rank)) ?? [];

  if (isSuccess && inactiveOwners.length === 0) {
    return null;
  }

  return (
    <Accordion label={`Propriétaires archivés (${inactiveOwners.length})`}>
      <OwnerList isLoading={isLoading} owners={inactiveOwners} />
    </Accordion>
  );
}

export default InactiveOwnerList;
