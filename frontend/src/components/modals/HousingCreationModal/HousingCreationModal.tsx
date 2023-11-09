import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Link } from 'react-router-dom';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import fp from 'lodash/fp';
import React, { useState } from 'react';
import * as yup from 'yup';

import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useForm } from '../../../hooks/useForm';
import { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { Col, Row, Text } from '../../_dsfr';
import ModalStepper from '../ModalStepper/ModalStepper';
import ModalStep from '../ModalStepper/ModalStep';
import {
  housingApi,
  useCreateHousingMutation,
} from '../../../services/housing.service';
import HousingResult from '../../HousingResult/HousingResult';
import { DatafoncierHousing } from '../../../../../shared';
import { OccupancyKind } from '../../../models/Housing';
import { unwrapError } from '../../../store/store';
import { datafoncierApi } from '../../../services/datafoncier.service';

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

  const [getHousing, getHousingQuery] = housingApi.useLazyGetHousingQuery();
  const { data: housing, error: getHousingError } = getHousingQuery;

  const [getDatafoncierHousing, getDatafoncierHousingQuery] =
    datafoncierApi.useLazyFindOneHousingQuery();
  const { data: datafoncierHousing, error: getDatafoncierHousingError } =
    getDatafoncierHousingQuery;
  const address = datafoncierHousing
    ? toAddress(datafoncierHousing)
    : undefined;
  async function findHousing(): Promise<boolean> {
    try {
      const bypassCache = true;
      await form.validate();
      await Promise.all([
        getDatafoncierHousing(localId, bypassCache).unwrap(),
        getHousing(localId, bypassCache)
          .unwrap()
          .then((housing) => {
            if (housing) {
              throw new Error('HousingExistsError');
            }
          })
          .catch((err) => {
            const error = unwrapError(err);
            if (error?.name === 'HousingMissingError') {
              return;
            }
            throw error;
          }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  const [doCreateHousing] = useCreateHousingMutation();
  async function createHousing(): Promise<boolean> {
    try {
      await doCreateHousing({ localId }).unwrap();
      props.onConfirm?.();
      return true;
    } catch {
      return false;
    }
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
        <p>Saisissez l’identifiant du logement (idlocal) à ajouter.</p>
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

        {unwrapError(getDatafoncierHousingError)?.name ===
          'HousingMissingError' && (
          <Alert
            severity="error"
            className="fr-mt-2w"
            title="Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies."
            description="Vérifiez les informations saisies afin de vous assurer qu’elles soient correctes, puis réessayez en modifiant l’identifiant du local."
            closable
          />
        )}

        {unwrapError(getHousingError)?.name === 'HousingExistsError' && (
          <Alert
            severity="error"
            className="fr-mt-2w"
            title="Ce logement existe déjà dans votre parc."
            description={<Link to={`/housing/${housing?.id}`}>ici</Link>}
            closable
          />
        )}
      </ModalStep>

      <ModalStep title="Ajouter un logement" onConfirm={createHousing}>
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
