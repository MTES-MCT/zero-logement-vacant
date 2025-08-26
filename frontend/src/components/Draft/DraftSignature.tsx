import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { FileUploadDTO, type SignatoriesDTO } from '@zerologementvacant/models';
import { useId } from 'react';
import { useFormContext } from 'react-hook-form';
import { match } from 'ts-pattern';

import { array, mixed, object, string } from 'yup-next';
import type { DraftCreationPayload } from '~/models/Draft';
import AppTextInputNext, {
  contramapEmptyString,
  mapNull
} from '../_app/AppTextInput/AppTextInputNext';
import FileUpload from '../FileUpload/FileUpload';
import styles from './draft.module.scss';
import LogoViewer from './LogoViewer';

export const signatureSchema = object({
  signatories: array()
    .of(
      object({
        firstName: string().trim().defined().nullable(),
        lastName: string().trim().defined().nullable(),
        role: string().trim().defined().nullable(),
        file: mixed().defined().nullable()
      }).nullable()
    )
    .nullable()
});

type Signatory = {
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  file: FileUploadDTO | null;
};
export type SignatureSchema = [Signatory | null, Signatory | null] | null;

function DraftSignature() {
  const { watch, setValue } = useFormContext<DraftCreationPayload>();
  const signatories = watch('sender.signatories');

  function onFileUpload(index: number, file: FileUploadDTO) {
    const currentSignatory = signatories?.[index] ?? {
      firstName: null,
      lastName: null,
      role: null,
      file: null
    };
    const updatedSignatory = { ...currentSignatory, file };
    const updatedSignatories = signatories?.with(index, updatedSignatory) ?? [
      index === 0 ? updatedSignatory : null,
      index === 1 ? updatedSignatory : null
    ];
    setValue('sender.signatories', updatedSignatories as SignatoriesDTO);
  }

  const uploadIds = [useId(), useId()];

  function onFileRemoval(index: number) {
    const currentSignatory = signatories?.[index] ?? {
      firstName: null,
      lastName: null,
      role: null,
      file: null
    };
    const updatedSignatories = signatories?.with(index, {
      ...currentSignatory,
      file: null
    });
    setValue('sender.signatories', updatedSignatories as SignatoriesDTO);
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
      {signatories?.map((signatory, index) => (
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
              <AppTextInputNext
                name={`sender.signatories.${index}.firstName`}
                label="Prénom du signataire"
                mapValue={mapNull}
                contramapValue={contramapEmptyString}
              />
            </Grid>
            <Grid size={6}>
              <AppTextInputNext
                name={`sender.signatories.${index}.lastName`}
                label="Nom du signataire"
                mapValue={mapNull}
                contramapValue={contramapEmptyString}
              />
            </Grid>

            <Grid size={12}>
              <AppTextInputNext
                name={`sender.signatories.${index}.role`}
                label="Rôle du signataire"
                mapValue={mapNull}
                contramapValue={contramapEmptyString}
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
