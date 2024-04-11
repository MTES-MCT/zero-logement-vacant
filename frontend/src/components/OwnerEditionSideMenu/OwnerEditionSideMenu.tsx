import Button from '@codegouvfr/react-dsfr/Button';
import React, { FormEvent, useState } from 'react';
import { object, string } from 'yup';

import OwnerAddressEdition from '../OwnerAddressEdition/OwnerAddressEdition';
import Aside from '../Aside/Aside';
import { useToggle } from '../../hooks/useToggle';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { Owner } from '../../models/Owner';
import { banAddressValidator, useForm } from '../../hooks/useForm';
import { useUpdateOwnerMutation } from '../../services/owner.service';
import { useNotification } from '../../hooks/useNotification';

interface Props {
  className?: string;
  owner: Owner;
}

function OwnerEditionSideMenu(props: Props) {
  const { active, setActive, toggle } = useToggle();

  const shape = {
    fullName: string().optional(),
    address: banAddressValidator.optional(),
    additionalAddress: string().optional().nullable(),
  };
  type FormShape = typeof shape;
  const schema = object(shape);

  const [fullName, setFullName] = useState(props.owner.fullName);
  const [address, setAddress] = useState(props.owner.banAddress);
  const [additionalAddress, setAdditionalAddress] = useState(
    props.owner.additionalAddress ?? ''
  );
  const formId = 'owner-edition-form';
  const form = useForm(schema, {
    address,
    additionalAddress,
    fullName,
  });

  function open(): void {
    setActive(true);
  }

  function close(): void {
    setActive(false);
  }

  const [updateOwner, mutation] = useUpdateOwnerMutation();

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    await form.validate(async () => {
      await updateOwner({
        ...props.owner,
        fullName,
        banAddress: address,
        additionalAddress,
      }).unwrap();
      close();
    });
  }

  useNotification({
    isError: mutation.isError,
    isLoading: mutation.isLoading,
    isSuccess: mutation.isSuccess,
    toastId: 'owner-edition',
  });

  return (
    <>
      <Button
        className={props.className}
        priority="tertiary"
        size="small"
        onClick={open}
      >
        Éditer l’adresse
      </Button>
      <Aside
        expand={active}
        title="Modifier les infos du propriétaire"
        content={
          <form id={formId} className="fr-px-6w">
            <AppTextInput<FormShape>
              inputForm={form}
              inputKey="fullName"
              label="Nom prénom"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <section className="fr-mb-3w">
              <OwnerAddressEdition
                banAddress={address}
                errorMessage={form.message('address')}
                help={false}
                rawAddress={props.owner.rawAddress}
                onSelectAddress={setAddress}
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
