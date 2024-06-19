import { ChangeEvent, ChangeEventHandler } from 'react';
import { object, string } from 'yup';

import { useForm } from '../../hooks/useForm';
import { Sender, SenderPayload } from '../../models/Sender';
import styles from './draft.module.scss';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import { Col, Container, Row } from '../_dsfr';
import FileUpload from '../FileUpload/FileUpload';
import { FileUploadDTO } from '@zerologementvacant/models';
import LogoViewer from './LogoViewer';

export const signatureSchema = object({
  signatoryFirstName: string().optional().nullable(),
  signatoryLastName: string().optional().nullable(),
  signatoryRole: string().optional().nullable(),
});

interface Props {
  form: ReturnType<typeof useForm>;
  value: SenderPayload;
  onChange(value: SenderPayload): void;
}

function DraftSignature(props: Readonly<Props>) {
  const signatoryFirstName = props.value.signatoryFirstName ?? '';
  const signatoryLastName = props.value.signatoryLastName ?? '';
  const signatoryRole = props.value.signatoryRole ?? '';

  function onChange(key: keyof Sender): ChangeEventHandler {
    return (e: ChangeEvent<HTMLInputElement>) => {
      if (props.value) {
        props.onChange({
          ...props.value,
          [key]: e.target.value,
        });
      }
    };
  }

  function onFileUpload(file: FileUploadDTO) {
    props.onChange({
      ...props.value,
      signatoryFile: file,
    });
  }

  function deleteFile() {
    console.log("delete");
    props.value.signatoryFile = null;
    props.onChange(props.value);
    const elem = document.getElementById('fr-upload-:r2h:-input') as HTMLInputElement;
    if(elem !== null) {
      elem.value = '';
    }
  }

  return (
    <Container as="article" className={styles.article}>
      <h6>Signature de l’expéditeur</h6>
      <Row className={styles.row} gutters>
        <Col n="6">
          <AppTextInput
            inputForm={props.form}
            inputKey="sender.signatoryLastName"
            label="Nom du signataire"
            value={signatoryLastName}
            onChange={onChange('signatoryLastName')}
          />
        </Col>
        <Col n="6">
          <AppTextInput
            inputForm={props.form}
            inputKey="sender.signatoryFirstName"
            label="Prénom du signataire"
            value={signatoryFirstName}
            onChange={onChange('signatoryFirstName')}
          />
        </Col>
      </Row>
      <AppTextInput
        inputForm={props.form}
        inputKey="sender.signatoryRole"
        label="Rôle du signataire"
        value={signatoryRole}
        onChange={onChange('signatoryRole')}
      />
      <FileUpload onUpload={onFileUpload} />

      <LogoViewer index={0} logo={props.value.signatoryFile as FileUploadDTO} onDelete={deleteFile} />
    </Container>
  );
}

export default DraftSignature;
