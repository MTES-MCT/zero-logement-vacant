import { createModal } from '@codegouvfr/react-dsfr/Modal';
import fp from 'lodash/fp';
import React, { useState } from 'react';
import * as yup from 'yup';

import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useForm } from '../../../hooks/useForm';
import { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { Col, Row, Text } from '../../_dsfr';
import { useLazyFindOneHousingQuery } from '../../../services/datafoncier.service';
import ModalStepper from '../ModalStepper/ModalStepper';
import ModalStep from '../ModalStepper/ModalStep';
import { useCreateHousingMutation } from '../../../services/housing.service';
import HousingResult from '../../HousingResult/HousingResult';
import { DatafoncierHousing } from '../../../../../shared';
import { OccupancyKind } from '../../../models/Housing';

interface Props {
  onConfirm?: () => void;
}

const modal = createModal({
  id: 'housing-creation-modal',
  isOpenedByDefault: false,
});

function HousingCreationModal(props: Props) {
  const [localId, setLocalId] = useState('');

  const shape = {
    localId: yup
      .string()
      .required('Veuillez renseigner un identifiant pour ce logement'),
  };
  type FormShape = typeof shape;
  const form = useForm(yup.object().shape(shape), {
    localId,
  });

  const [doFindHousing, findHousingQuery] = useLazyFindOneHousingQuery();
  const housing = findHousingQuery.data;
  const address = housing ? toAddress(housing) : undefined;
  async function findHousing(): Promise<void> {
    await form.validate();
    await doFindHousing(localId, true).unwrap();
  }

  const [doCreateHousing] = useCreateHousingMutation();
  async function createHousing(): Promise<void> {
    await doCreateHousing({ localId }).unwrap();
    props.onConfirm?.();
  }

  const openingButtonProps: ButtonProps = {
    iconId: 'fr-icon-add-line',
    size: 'small',
    children: 'Ajouter un logement',
    onClick: modal.open,
  };

  return (
    <ModalStepper openingButtonProps={openingButtonProps} size="large">
      <ModalStep title="Ajouter un logement" onConfirm={findHousing}>
        <p>Saisissez l'identifiant du logement (idlocal) à ajouter.</p>
        <form id="housing-creation-form">
          <Row>
            <Col>
              <AppTextInput<FormShape>
                inputForm={form}
                inputKey="localId"
                label="Identifiant du logement"
                required
                value={localId}
                onChange={(e) => setLocalId(e.target.value)}
              />
            </Col>
          </Row>
        </form>
      </ModalStep>
      <ModalStep title="Ajouter un logement" onConfirm={createHousing}>
        <Text size="lg">
          Voici le logement que nous avons trouvé à cette adresse/sur cette
          parcelle.
        </Text>
        {address && housing && (
          <HousingResult
            address={address}
            display="two-lines"
            localId={housing.idlocal}
            occupancy={housing.ccthp as OccupancyKind}
          />
        )}
      </ModalStep>
    </ModalStepper>
  );
}

function toAddress(housing: DatafoncierHousing): string {
  const streetNumber = fp.trimCharsStart('0', housing.dnvoiri);
  const repetition = housing.dindic ?? '';
  const street = housing.dvoilib;
  const zipcode = housing.idcom;
  const city = housing.idcomtxt;
  return `${streetNumber}${repetition} ${street}, ${zipcode} ${city}`;
}

export default HousingCreationModal;
