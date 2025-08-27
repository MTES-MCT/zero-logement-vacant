import Typography from '@mui/material/Typography';
import {
  FileUploadDTO,
  type DraftUpdatePayload
} from '@zerologementvacant/models';
import classNames from 'classnames';
import { useFormContext } from 'react-hook-form';

import { Container, Row } from '../_dsfr';
import FileUpload from '../FileUpload/FileUpload';
import styles from './draft.module.scss';
import LogoViewer from './LogoViewer';

function DraftSenderLogo() {
  const { watch, setValue } = useFormContext<DraftUpdatePayload>();
  const files = watch('logo') as FileUploadDTO[];

  function onUpload(index: number) {
    return (file: FileUploadDTO): void => {
      const newFiles = [...files];
      newFiles[index] = file;
      setValue('logo', newFiles);
    };
  }

  function deleteLogo(id: string, index: number) {
    return (): void => {
      const newFiles = [...files].filter((file) => file?.id !== id);
      setValue('logo', newFiles);
      const elem = document.getElementById(
        `fileUploadLogo${index}-input`
      ) as HTMLInputElement;
      if (elem !== null) {
        elem.value = '';
      }
    };
  }

  return (
    <Container as="section" className={classNames(styles.article)} fluid>
      <Row>
        <FileUpload
          id="fileUploadLogo0"
          label={
            <Typography component="h4" variant="h6" mb={2}>
              Logos de l’expéditeur
            </Typography>
          }
          onUpload={onUpload(0)}
        />
        <LogoViewer
          index={0}
          logo={files[0]}
          onDelete={deleteLogo(files[0]?.id, 0)}
        />
      </Row>
      <Row spacing="mb-2w">
        <FileUpload
          id="fileUploadLogo1"
          hint=""
          label={null}
          onUpload={onUpload(1)}
        />
        <LogoViewer
          index={1}
          logo={files[1]}
          onDelete={deleteLogo(files[1]?.id, 1)}
        />
      </Row>
    </Container>
  );
}

export default DraftSenderLogo;
