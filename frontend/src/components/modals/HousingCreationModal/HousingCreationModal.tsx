import Button from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';

import createFillLocalIdModal from './FillLocalId';
import createReviewHousingModal from './ReviewHousing';
import type { Housing } from '~/models/Housing';

interface Props {
  onFinish?(housing: Housing): void;
}

const fillLocalIdModal = createFillLocalIdModal();
const reviewHousingModal = createReviewHousingModal();

function HousingCreationModal(props: Props) {
  const [localId, setLocalId] = useState<string | null>(null);

  function handleFillLocalIdCancel() {
    fillLocalIdModal.close();
  }

  function handleFillLocalIdNext(localId: string) {
    setLocalId(localId);
    fillLocalIdModal.close();
    reviewHousingModal.open();
  }

  function handleReviewHousingBack() {
    reviewHousingModal.close();
    fillLocalIdModal.open();
  }

  function handleReviewHousingConfirm(housing: Housing) {
    reviewHousingModal.close();
    props.onFinish?.(housing);
  }

  return (
    <>
      <Button
        iconId="fr-icon-add-line"
        priority="secondary"
        onClick={fillLocalIdModal.open}
      >
        Ajouter un logement
      </Button>

      <fillLocalIdModal.Component
        onCancel={handleFillLocalIdCancel}
        onNext={handleFillLocalIdNext}
      />

      <reviewHousingModal.Component
        onBack={handleReviewHousingBack}
        localId={localId}
        onConfirm={handleReviewHousingConfirm}
      />
    </>
  );
}

export default HousingCreationModal;
