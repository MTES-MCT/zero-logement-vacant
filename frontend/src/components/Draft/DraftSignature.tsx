import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { match } from 'ts-pattern';
import { ChangeEvent, ChangeEventHandler } from 'react';
import { object, string } from 'yup';

import { FileUploadDTO, SignatoriesDTO } from '@zerologementvacant/models';
import { useForm } from '../../hooks/useForm';
import {
  Sender,
  SenderPayload,
  SignatoriesPayload,
  SignatoryPayload
} from '../../models/Sender';
import styles from './draft.module.scss';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import FileUpload from '../FileUpload/FileUpload';
import LogoViewer from './LogoViewer';

export const signatureSchema = object({
  signatoryFirstName: string().optional().nullable(),
  signatoryLastName: string().optional().nullable(),
  signatoryRole: string().optional().nullable()
});

interface Props {
  form: ReturnType<typeof useForm>;
  value: SignatoriesPayload;
  onChange(value: SignatoriesPayload): void;
}

function DraftSignature(props: Readonly<Props>) {
  function onChange(
    index: number,
    key: keyof SignatoryPayload
  ): ChangeEventHandler {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value === '' ? null : e.target.value;
      const signatory = props.value?.[index];
      const signatories = props.value?.with(index, {
        firstName: signatory?.firstName ?? null,
        lastName: signatory?.lastName ?? null,
        role: signatory?.role ?? null,
        file: signatory?.file ?? null,
        [key]: value
        // Typescript does not understand that there are always 2 elements
      }) as SignatoriesPayload;
      props.onChange(signatories);
    };
  }

  function onFileUpload(index: number, file: FileUploadDTO) {
    const signatory: SignatoryPayload = props.value?.[index] ?? {
      firstName: null,
      lastName: null,
      role: null,
      file: null
    };
    const signatories =
      props.value?.with(index, { ...signatory, file }) ?? null;
    props.onChange(signatories as SignatoriesPayload);
  }

  function deleteFile() {
    // props.value.signatoryFile = null;
    // props.onChange(props.value);
    // const elem = document.getElementById(
    //   `fileUploadSignature-input`
    // ) as HTMLInputElement;
    // if (elem !== null) {
    //   elem.value = '';
    // }
  }

  function title(index: number): string {
    return match(index)
      .with(0, () => 'Signature du premier expéditeur')
      .with(1, () => 'Signature du second expéditeur')
      .otherwise(() => 'Signature de l’expéditeur');
  }

  return (
    <Grid component="article" className={styles.article}>
      {props.value?.map((signatory, index) => (
        <>
          <Typography component="h4" variant="h6" mb={2}>
            {title(index)}
          </Typography>

          <Grid className={styles.row} spacing={4}>
            <Grid xs={6}>
              <AppTextInput
                inputForm={props.form}
                inputKey={`signatories.${index}.firstName`}
                label="Prénom du signataire"
                value={signatory?.firstName ?? ''}
                onChange={onChange(index, 'firstName')}
              />
            </Grid>
            <Grid xs={6}>
              <AppTextInput
                inputForm={props.form}
                inputKey="sender.signatoryLastName"
                label="Nom du signataire"
                value={signatory?.lastName ?? ''}
                onChange={onChange(index, 'lastName')}
              />
            </Grid>
          </Grid>
          <AppTextInput
            inputForm={props.form}
            inputKey="sender.signatoryRole"
            label="Rôle du signataire"
            value={signatory?.role ?? ''}
            onChange={onChange(index, 'role')}
          />
          <FileUpload
            id="fileUploadSignature"
            onUpload={(file) => onFileUpload(index, file)}
          />

          <LogoViewer
            index={0}
            logo={signatory?.file ?? null}
            onDelete={deleteFile}
          />
        </>
      ))}
    </Grid>
  );
}

export default DraftSignature;
