import * as yup from 'yup';
import type { ChangeEvent, ChangeEventHandler } from 'react';

import { PHONE_REGEXP } from '@zerologementvacant/schemas';
import { useForm } from '../../hooks/useForm';
import styles from './draft.module.scss';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { Col, Container, Row } from '../_dsfr';
import Typography from '@mui/material/Typography';
import type { Sender, SenderPayload } from '../../models/Sender';

export const senderSchema = yup.object({
  name: yup.string().trim().default(undefined),
  service: yup.string().trim().default(undefined),
  firstName: yup.string().trim().default(undefined),
  lastName: yup.string().trim().default(undefined),
  address: yup.string().trim().default(undefined),
  email: yup.string()
    .nullable()
    .default(undefined)
    .email(
      'Veuillez renseigner un courriel valide. Exemple de format valide : exemple@gmail.com'
    ),
  phone: yup.string()
    .nullable()
    .default(undefined)
    .matches(PHONE_REGEXP, {
      message:
        'Veuillez renseigner un numéro de téléphone valide. Exemple de format valide : +33123456789 ou 0612345678',
      excludeEmptyString: true
    })
});

interface Props {
  form: ReturnType<typeof useForm>;
  value: SenderPayload;
  onChange(value: SenderPayload): void;
}

function DraftSender(props: Readonly<Props>) {
  const email = props.value.email ?? '';
  const phone = props.value.phone ?? '';

  function onChange(key: keyof Sender): ChangeEventHandler {
    return (e: ChangeEvent<HTMLInputElement>) => {
      if (props.value) {
        props.onChange({
          ...props.value,
          [key]: e.target.value
        });
      }
    };
  }

  return (
    <Container as="article" className={styles.article}>
      <Typography component="h4" variant="h6" mb={2}>
        Coordonnées de l’expéditeur
      </Typography>
      <AppTextInput
        inputForm={props.form}
        inputKey="sender.name"
        label="Nom de la collectivité ou de l’administration"
        value={props.value.name}
        onChange={onChange('name')}
      />
      <AppTextInput
        inputForm={props.form}
        inputKey="sender.service"
        label="Service"
        value={props.value.service}
        onChange={onChange('service')}
      />
      <Row className={styles.row} gutters>
        <Col n="6">
          <AppTextInput
            inputForm={props.form}
            inputKey="sender.lastName"
            label="Nom"
            value={props.value.lastName}
            onChange={onChange('lastName')}
          />
        </Col>
        <Col n="6">
          <AppTextInput
            inputForm={props.form}
            inputKey="sender.firstName"
            label="Prénom"
            value={props.value.firstName}
            onChange={onChange('firstName')}
          />
        </Col>
      </Row>
      <AppTextInput
        inputForm={props.form}
        inputKey="sender.address"
        label="Adresse"
        value={props.value.address}
        onChange={onChange('address')}
      />
      <Row gutters>
        <Col n="6">
          <AppTextInput
            inputForm={props.form}
            inputKey="sender.email"
            label="Adresse e-mail"
            value={email}
            type="email"
            onChange={onChange('email')}
          />
        </Col>
        <Col n="6">
          <AppTextInput
            inputForm={props.form}
            inputKey="sender.phone"
            label="Téléphone"
            value={phone}
            type="tel"
            onChange={onChange('phone')}
          />
        </Col>
      </Row>
    </Container>
  );
}

export default DraftSender;
