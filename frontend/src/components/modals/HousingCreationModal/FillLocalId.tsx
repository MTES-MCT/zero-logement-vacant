import Alert from '@codegouvfr/react-dsfr/Alert';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { forwardRef, useImperativeHandle, useState } from 'react';
import * as yup from 'yup';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useForm } from '../../../hooks/useForm';
import { unwrapError } from '../../../store/store';
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
      .required('Veuillez renseigner un identifiant pour ce logement')
  };
  type FormShape = typeof shape;
  const form = useForm(yup.object().shape(shape), {
    localId
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
            })
        ]);
        dispatch(changeCreator({ localId }));
        return 'review-housing';
      } catch (error) {
        return null;
      }
    }
  }));

  function inputState(): { state: string; stateRelatedMessage?: string } {
    if (housing) {
      return {
        state: 'error',
        stateRelatedMessage: 'Ce logement existe déjà dans votre parc'
      };
    }

    if (
      unwrapError(getDatafoncierHousingQuery.error)?.name ===
      'HousingMissingError'
    ) {
      return {
        state: 'error',
        stateRelatedMessage:
          'Nous n’avons pas pu trouver de logement avec les informations que vous avez fournies. Vérifiez les informations saisies afin de vous assurer qu’elles soient correctes, puis réessayez en modifiant l’identifiant du logement.'
      };
    }

    return {
      state: 'default',
      stateRelatedMessage: undefined
    };
  }

  const { state, stateRelatedMessage } = inputState();

  return (
    <>
      <Typography sx={{ fontSize: '1.125rem', mb: 2 }}>
        Saisissez l’identifiant du logement à ajouter.
      </Typography>
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
            &nbsp;est une concaténation du&nbsp;
            <a
              href="https://doc-datafoncier.cerema.fr/doc/dv3f/local/coddep"
              target="_blank"
              rel="noreferrer"
            >
              &nbsp;code département
            </a>
            &nbsp;du logement et de&nbsp;
            <a
              href="https://doc-datafoncier.cerema.fr/doc/ff/pb0010_local/invar"
              target="_blank"
              rel="noreferrer"
            >
              l’identifiant fiscal départemental
            </a>
            &nbsp;du logement, dans cet ordre-là.
          </>
        }
      />
      <form id="housing-creation-form" onSubmit={(e) => e.preventDefault()}>
        <Grid container>
          <Grid xs={8}>
            <AppTextInput<FormShape>
              inputForm={form}
              inputKey="localId"
              label="Identifiant fiscal départemental (obligatoire)"
              required
              value={localId}
              state={state}
              stateRelatedMessage={stateRelatedMessage}
              onChange={(e) => setLocalId(e.target.value)}
            />
          </Grid>
        </Grid>
      </form>
    </>
  );
});

FillLocalId.displayName = 'FillLocalId';

const step: Step = {
  id: 'fill-local-id',
  Component: FillLocalId
};

export default step;
