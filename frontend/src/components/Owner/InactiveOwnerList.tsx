import { isInactiveOwnerRank } from '@zerologementvacant/models';

import { useFindOwnersByHousingQuery } from '../../services/owner.service';
import OwnerListNext from '~/components/Owner/OwnerListNext';
import Accordion from '@codegouvfr/react-dsfr/Accordion';

export interface InactiveOwnerListProps {
  housingId: string;
}

function InactiveOwnerListNext(props: InactiveOwnerListProps) {
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
      <OwnerListNext isLoading={isLoading} owners={inactiveOwners} />
    </Accordion>
  );
}

export default InactiveOwnerListNext;
