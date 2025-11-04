import type { DatafoncierHousing } from '@zerologementvacant/models';
import { forwardRef, useImperativeHandle } from 'react';
import { useAppSelector } from '../../../hooks/useStore';
import { OccupancyKind } from '../../../models/Housing';
import { datafoncierApi } from '../../../services/datafoncier.service';
import { useCreateHousingMutation } from '../../../services/housing.service';
import { Text } from '../../_dsfr';

import HousingResult from '../../HousingResult/HousingResult';
import type { Step, StepProps } from '../ModalStepper/ModalGraphStepper';

const ReviewHousing = forwardRef((_: StepProps, ref) => {
  const { creator } = useAppSelector((state) => state.housing);
  const { localId } = creator;
  const { data: datafoncierHousing } = datafoncierApi.useFindOneHousingQuery(
    localId as string,
    { skip: !localId }
  );

  const address = datafoncierHousing
    ? toAddress(datafoncierHousing)
    : undefined;

  const [doCreateHousing] = useCreateHousingMutation();

  useImperativeHandle(ref, () => ({
    onNext: async () => {
      try {
        if (localId) {
          await doCreateHousing({ localId }).unwrap();
          return '';
        }
        return null;
      } catch {
        return null;
      }
    }
  }));

  return (
    <>
      <Text size="lg">
        Voici le logement que nous avons trouvé à cette adresse/sur cette
        parcelle.
      </Text>
      {address && datafoncierHousing && (
        <HousingResult
          address={address}
          display="two-lines"
          localId={datafoncierHousing.idlocal}
          occupancy={datafoncierHousing.ccthp as OccupancyKind}
        />
      )}
    </>
  );
});

ReviewHousing.displayName = 'ReviewHousing';

const step: Step = {
  id: 'review-housing',
  Component: ReviewHousing
};

function toAddress(housing: DatafoncierHousing): string {
  const streetNumber = housing.dnvoiri.replace('^0+', '0');
  const repetition = housing.dindic ?? '';
  const street = housing.dvoilib;
  const zipcode = housing.idcom;
  const city = housing.idcomtxt;
  return `${streetNumber}${repetition} ${street}, ${zipcode} ${city}`;
}

export default step;
