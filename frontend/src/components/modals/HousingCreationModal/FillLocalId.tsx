import { forwardRef, useImperativeHandle, useState } from 'react';
import * as yup from 'yup';

import { Col, Row, Text } from '../../_dsfr';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useForm } from '../../../hooks/useForm';
import { unwrapError } from '../../../store/store';
import Alert from '@codegouvfr/react-dsfr/Alert';
import { datafoncierApi } from '../../../services/datafoncier.service';
import { housingApi } from '../../../services/housing.service';
import { useAppDispatch } from '../../../hooks/useStore';
import housingSlice from '../../../store/reducers/housingReducer';
import { Step, StepProps } from '../ModalStepper/ModalGraphStepper';

const FillLocalId = forwardRef((props: StepProps, ref) => {
  const [localId, setLocalId] = useState('');
  const dispatch = useAppDispatch();
  const { changeCreator } = housingSlice.actions;

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
  const { data: housing } = getHousingQuery;
  const [getDatafoncierHousing, getDatafoncierHousingQuery] =
    datafoncierApi.useLazyFindOneHousingQuery();

  useImperativeHandle(ref, () => ({
    onNext: async () => {
      try {
        const bypassCache = false;
        await form.validate();
        await Promise.all([
          getDatafoncierHousing(localId, bypassCache).unwrap(),
          getHousing(localId, bypassCache)
            .unwrap()
            .catch((err) => {
              const error = unwrapError(err);
              if (error?.name === 'HousingMissingError') {
                return;
              }
              throw error;
            })
            .then((housing) => {
              if (housing) {
                throw new Error('HousingExistsError');
              }
            }),
        ]);
        dispatch(changeCreator({ localId }));
        return 'review-housing';
      } catch (error) {
        return null;
      }
    },
  }));

  return (
    <>
      <Text size="lg" spacing="mb-2w">
        Saisissez l’identifiant du logement à ajouter.
      </Text>
      <Alert
        className="fr-mb-2w"
        severity="info"
        title="Comment trouver l’identifiant du logement que je souhaite ajouter ?"
        description={
          <>
            <a
              href="https://doc-datafoncier.cerema.fr/doc/ff/pb0010_local/idlocal"
              target="_blank"
              rel="noreferrer"
            >
              L’identifiant du logement
            </a>
            &nbsp;est une concaténation du
            <a
              href="https://doc-datafoncier.cerema.fr/doc/dv3f/local/coddep"
              target="_blank"
              rel="noreferrer"
            >
              code département
            </a>
            &nbsp;du logement et de
            <a
              href="https://doc-datafoncier.cerema.fr/doc/ff/pb0010_local/invar"
              target="_blank"
              rel="noreferrer"
            >
              l’invariant fiscal
            </a>
            &nbsp;du logement, dans cet ordre-là.
          </>
        }
      />
      <form id="housing-creation-form" onSubmit={(e) => e.preventDefault()}>
        <Row>
          <Col n="6">
            <AppTextInput<FormShape>
              inputForm={form}
              inputKey="localId"
              label="Identifiant du logement (obligatoire)"
              required
              value={localId}
              state={housing ? 'error' : 'default'}
              stateRelatedMessage={
                housing ? 'Ce logement existe déjà dans votre parc' : undefined
              }
              onChange={(e) => setLocalId(e.target.value)}
            />
          </Col>
        </Row>
      </form>

      {unwrapError(getDatafoncierHousingQuery.error)?.name ===
        'HousingMissingError' && (
        <Alert
          severity="error"
          className="fr-mt-2w"
          title="Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies."
          description="Vérifiez les informations saisies afin de vous assurer qu’elles soient correctes, puis réessayez en modifiant l’identifiant du logement."
          closable
        />
      )}
    </>
  );
});

FillLocalId.displayName = 'FillLocalId';

const step: Step = {
  id: 'fill-local-id',
  Component: FillLocalId,
};

export default step;
