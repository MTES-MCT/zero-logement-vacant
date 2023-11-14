import RadioButtons from '@codegouvfr/react-dsfr/RadioButtons';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import * as yup from 'yup';

import { useForm } from '../../../hooks/useForm';
import { Step, StepProps } from '../../../hooks/useGraphStepper';

const step: Step = {
  id: 'knows-local-id',
  Component: forwardRef((props: StepProps, ref) => {
    const [knowsLocalId, setKnowsLocalId] = useState<'yes' | 'no'>();
    const shape = {
      knowsLocalId: yup
        .string()
        .oneOf(['yes', 'no'])
        .required('Veuillez renseigner une valeur'),
    };
    const form = useForm(yup.object().shape(shape), {
      knowsLocalId,
    });

    useImperativeHandle(ref, () => ({
      onNext: async () => {
        try {
          await form.validate();
          if (knowsLocalId === 'yes') {
            return 'fill-local-id';
          }

          if (knowsLocalId === 'no') {
            return 'search-housing';
          }

          return null;
        } catch {
          return null;
        }
      },
    }));

    return (
      <RadioButtons
        legend="Connaissez-vous l’identifiant du logement à ajouter ?"
        hintText="Cela nous permettra de retrouver plus facilement le logement sur le territoire de votre collectivité. Vous pouvez cliquer ici pour en savoir plus sur ce qu’est l’identifiant du local."
        name="knows-local-id"
        state={form.messageType('knowsLocalId')}
        stateRelatedMessage={form.message('knowsLocalId')}
        options={[
          {
            label: 'Oui',
            nativeInputProps: {
              checked: knowsLocalId === 'yes',
              onChange: () => setKnowsLocalId('yes'),
            },
          },
          {
            label: 'Non',
            nativeInputProps: {
              checked: knowsLocalId === 'no',
              onChange: () => setKnowsLocalId('no'),
            },
          },
        ]}
      />
    );
  }),
};

export default step;
