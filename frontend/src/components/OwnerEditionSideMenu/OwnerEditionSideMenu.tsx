import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import { Grid, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { object, string } from 'yup';
import { banAddressValidator, useForm } from '../../hooks/useForm';
import { useNotification } from '../../hooks/useNotification';
import { useToggle } from '../../hooks/useToggle';
import { Owner } from '../../models/Owner';
import { useUpdateOwnerMutation } from '../../services/owner.service';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import Aside from '../Aside/Aside';

import OwnerAddressEdition from '../OwnerAddressEdition/OwnerAddressEdition';

interface Props {
  className?: string;
  owner: Owner;
}

function OwnerEditionSideMenu(props: Props) {
  const { active, setActive, toggle } = useToggle();

  const storedWarningVisible = localStorage.getItem(
    'OwnerEdition.warningVisible'
  );
  const [warningVisible, setWarningVisible] = useState(
    storedWarningVisible === null || storedWarningVisible === 'true'
  );

  const shape = {
    address: banAddressValidator.optional(),
    additionalAddress: string().optional().nullable()
  };
  type FormShape = typeof shape;
  const schema = object(shape);

  const [address, setAddress] = useState(props.owner.banAddress);
  const [additionalAddress, setAdditionalAddress] = useState(
    props.owner.additionalAddress ?? ''
  );
  const formId = 'owner-edition-form';
  const form = useForm(schema, {
    address,
    additionalAddress
  });

  function open(): void {
    setActive(true);
  }

  function close(): void {
    setActive(false);
  }

  const [updateOwner, mutation] = useUpdateOwnerMutation();

  async function save(event: FormEvent): Promise<void> {
    localStorage.setItem(
      'OwnerEdition.warningVisible',
      warningVisible.toString()
    );
    event.preventDefault();
    await form.validate(async () => {
      await updateOwner({
        ...props.owner,
        banAddress: address,
        additionalAddress
      }).unwrap();
      close();
    });
  }

  useNotification({
    isError: mutation.isError,
    isLoading: mutation.isLoading,
    isSuccess: mutation.isSuccess,
    toastId: 'owner-edition'
  });

  if (!active) {
    return (
      <Button
        className={props.className}
        priority="tertiary"
        size="small"
        onClick={open}
      >
        Éditer
      </Button>
    );
  }

  return (
    <>
      <Button
        className={props.className}
        priority="tertiary"
        size="small"
        onClick={open}
      >
        Éditer
      </Button>
      <Aside
        expand={active}
        title="Modifier les informations du propriétaire"
        content={
          <form id={formId} className="fr-px-6w">
            <Grid container>
              <Typography
                component="h3"
                color={fr.colors.decisions.text.active.grey.default}
              >
                <span
                  className={fr.cx(
                    'fr-icon-bank-line',
                    'fr-icon--sm',
                    'fr-mr-1w'
                  )}
                  aria-hidden={true}
                />
                Adresse fiscale (source: DGFIP)
              </Typography>
              <Grid>
                <span className="fr-hint-text">
                  Cette adresse est issue du fichier LOVAC, récupérée via le
                  fichier 1767BIS-COM. Celle-ci n’est pas modifiable.
                </span>
                <Typography
                  color={fr.colors.decisions.text.default.grey.default}
                >
                  {props.owner.rawAddress
                    ? props.owner.rawAddress.join(' ')
                    : 'Inconnue'}
                </Typography>
              </Grid>
            </Grid>
            <section className="fr-mb-3w fr-mt-3w">
              <Typography
                component="h3"
                color={fr.colors.decisions.text.active.grey.default}
              >
                <span
                  className={fr.cx(
                    'fr-icon-home-4-line',
                    'fr-icon--sm',
                    'fr-mr-1w'
                  )}
                  aria-hidden={true}
                />
                Adresse postale (source: Base Adresse Nationale)
              </Typography>
              <OwnerAddressEdition
                banAddress={address}
                errorMessage={form.message('address')}
                help={false}
                onSelectAddress={(value) => setAddress(value ?? undefined)}
                warningVisible={warningVisible}
                setWarningVisible={setWarningVisible}
              />
            </section>
            <AppTextInput<FormShape>
              label="Complément d'adresse"
              inputForm={form}
              inputKey="additionalAddress"
              value={additionalAddress}
              onChange={(e) => setAdditionalAddress(e.target.value)}
            />
          </form>
        }
        footer={
          <>
            <Button className="fr-mr-1w" priority="secondary" onClick={close}>
              Annuler
            </Button>
            <Button
              nativeButtonProps={{ form: formId }}
              priority="primary"
              onClick={save}
              type="submit"
            >
              Enregistrer
            </Button>
          </>
        }
        onClose={toggle}
      />
    </>
  );
}

export default OwnerEditionSideMenu;
