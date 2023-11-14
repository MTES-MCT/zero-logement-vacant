import { forwardRef, useImperativeHandle, useState } from 'react';
import * as yup from 'yup';

import { Step, StepProps } from '../../../hooks/useGraphStepper';
import { Col, Row } from '../../_dsfr';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useForm } from '../../../hooks/useForm';
import { unwrapError } from '../../../store/store';
import Alert from '@codegouvfr/react-dsfr/Alert';
import { datafoncierApi } from '../../../services/datafoncier.service';
import { housingApi } from '../../../services/housing.service';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../../../hooks/useStore';
import housingSlice from '../../../store/reducers/housingReducer';

const step: Step = {
  id: 'fill-local-id',
  Component: forwardRef((props: StepProps, ref) => {
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

        {unwrapError(getDatafoncierHousingQuery.error)?.name ===
          'HousingMissingError' && (
          <Alert
            severity="error"
            className="fr-mt-2w"
            title="Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies."
            description="Vérifiez les informations saisies afin de vous assurer qu’elles soient correctes, puis réessayez en modifiant l’identifiant du local."
            closable
          />
        )}

        {housing && (
          <Alert
            severity="error"
            className="fr-mt-2w"
            title="Ce logement existe déjà dans votre parc."
            description={<Link to={`/housing/${housing?.id}`}>ici</Link>}
            closable
          />
        )}
      </>
    );
  }),
};

export default step;
