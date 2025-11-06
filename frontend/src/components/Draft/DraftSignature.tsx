import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { match } from 'ts-pattern';
import type { ChangeEvent, ChangeEventHandler } from 'react';

import { useForm } from '../../hooks/useForm';
import styles from './draft.module.scss';
import AppTextInput from '../_app/AppTextInput/AppTextInput';
import FileUpload from '../FileUpload/FileUpload';
import LogoViewer from './LogoViewer';
import type { FileUploadDTO } from '@zerologementvacant/models';
import type { SignatoriesPayload, SignatoryPayload } from '../../models/Sender';

interface Props {
  form: ReturnType<typeof useForm>;
  value: SignatoriesPayload | null;
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

  const uploadIds = [useId(), useId()];

  function onFileRemoval(index: number) {
    const signatory: SignatoryPayload = props.value?.[index] ?? {
      firstName: null,
      lastName: null,
      role: null,
      file: null
    };
    const signatories = props?.value?.with(index, { ...signatory, file: null });
    props.onChange(signatories as SignatoriesPayload);
    const input = document.getElementById(
      uploadIds[index]
    ) as HTMLInputElement | null;
    if (input !== null) {
      input.value = '';
    }
  }

  function title(index: number): string {
    return match(index)
      .with(0, () => 'Signature du premier expéditeur')
      .with(1, () => 'Signature du second expéditeur')
      .otherwise(() => 'Signature de l’expéditeur');
  }

  return (
    <Grid
      container
      component="article"
      alignItems="flex-start"
      justifyContent="flex-end"
      size={10}
      offset={2}
    >
      {props.value?.map((signatory, index) => (
        <Grid
          container
          key={index}
          className={styles.article}
          sx={{ ml: 2, p: 2 }}
          size="grow"
        >
          <Grid container spacing={2}>
            <Grid size={12}>
              <Typography component="h4" variant="h6" mb={2}>
                {title(index)}
              </Typography>
            </Grid>
            <Grid size={6}>
              <AppTextInput
                inputForm={props.form}
                inputKey={`signatories.${index}.firstName`}
                label="Prénom du signataire"
                value={signatory?.firstName ?? ''}
                onChange={onChange(index, 'firstName')}
              />
            </Grid>
            <Grid size={6}>
              <AppTextInput
                inputForm={props.form}
                inputKey="sender.signatoryLastName"
                label="Nom du signataire"
                value={signatory?.lastName ?? ''}
                onChange={onChange(index, 'lastName')}
              />
            </Grid>

            <Grid size={12}>
              <AppTextInput
                inputForm={props.form}
                inputKey="sender.signatoryRole"
                label="Rôle du signataire"
                value={signatory?.role ?? ''}
                onChange={onChange(index, 'role')}
              />
            </Grid>

            <Grid size={12}>
              <FileUpload
                id={uploadIds[index]}
                onUpload={(file) => onFileUpload(index, file)}
              />

              <LogoViewer
                index={0}
                logo={signatory?.file ?? null}
                onDelete={() => onFileRemoval(index)}
              />
            </Grid>
          </Grid>
        </Grid>
      ))}
    </Grid>
  );
}

export default DraftSignature;
