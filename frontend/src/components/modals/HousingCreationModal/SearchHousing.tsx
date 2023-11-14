import { forwardRef, useImperativeHandle, useState } from 'react';
import * as yup from 'yup';

import { Step, StepProps } from '../../../hooks/useGraphStepper';
import { Text } from '../../_dsfr';
import AppTextInput from '../../_app/AppTextInput/AppTextInput';
import { useForm } from '../../../hooks/useForm';
import { datafoncierApi } from '../../../services/datafoncier.service';
import { useAppDispatch } from '../../../hooks/useStore';
import housingSlice from '../../../store/reducers/housingReducer';
import { Alert } from '@codegouvfr/react-dsfr/Alert';

const step: Step = {
  id: 'search-housing',
  Component: forwardRef((props: StepProps, ref) => {
    const dispatch = useAppDispatch();
    const { changeCreator } = housingSlice.actions;
    const geoCode = '67343';
    const [address, setAddress] = useState<string>();
    const [refcad, setRefcad] = useState<string>();
    const shape = {
      address: yup.string(),
      refcad: yup.string(),
    };
    type FormShape = typeof shape;
    const form = useForm(yup.object().shape(shape), {
      address,
      refcad,
    });

    const [error, setError] = useState<{
      title: string;
      description: string;
    }>();
    const [findHousing] = datafoncierApi.useLazyFindHousingQuery();
    useImperativeHandle(ref, () => ({
      onNext: async () => {
        try {
          const housingList = await findHousing({
            address,
            geoCode,
            refcad,
          }).unwrap();
          if (!housingList.length) {
            setError({
              title:
                'Nous n’avons pas pu trouver de logements avec les informations que vous avez fournies.',
              description:
                'Vérifiez les informations saisies afin de vous assurer qu’elles soient correctes, puis réessayez en modifiant l’adresse ou la référence cadastrale.',
            });
            return null;
          }

          dispatch(changeCreator({ housingList }));
          return 'review-housing';
        } catch {
          return null;
        }
      },
    }));

    return (
      <>
        <Text size="lg">
          Saisissez l’adresse du logement ou la référence cadastrale du
          logement.
        </Text>
        <AppTextInput<FormShape>
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          inputForm={form}
          inputKey="address"
          label="Adresse"
        />
        <AppTextInput<FormShape>
          value={refcad}
          onChange={(e) => setRefcad(e.target.value)}
          inputForm={form}
          inputKey="refcad"
          label="Référence cadastrale"
        />

        {error && (
          <Alert
            severity="error"
            className="fr-mt-2w"
            title={error.title}
            description={error.description}
            closable
          />
        )}
      </>
    );
  }),
};

export default step;
