import { Container, Row } from '../_dsfr';
import FileUpload from '../FileUpload/FileUpload';
import styles from './draft.module.scss';
import classNames from 'classnames';
import LogoViewer from './LogoViewer';
import Typography from '@mui/material/Typography';
import type { FileUploadDTO } from '@zerologementvacant/models';

interface Props {
  className?: string;
  value: FileUploadDTO[];
  onChange(value: FileUploadDTO[]): void;
}

function DraftSenderLogo(props: Readonly<Props>) {
  const { value: files } = props;

  function onUpload(index: number) {
    return (file: FileUploadDTO): void => {
      const newFiles = [...files];
      newFiles[index] = file;
      props.onChange(newFiles);
    };
  }

  function deleteLogo(id: string, index: number) {
    return (): void => {
      const newFiles = [...files].filter((file) => file?.id !== id);
      props.onChange(newFiles);
      const elem = document.getElementById(
        `fileUploadLogo${index}-input`
      ) as HTMLInputElement;
      if (elem !== null) {
        elem.value = '';
      }
    };
  }

  return (
    <Container
      as="section"
      role="group"
      aria-labelledby="draft-sender-logo-label"
      className={classNames(styles.article, props.className)}
      fluid
    >
      <Row>
        <Typography
          id="draft-sender-logo-label"
          component="h4"
          variant="h6"
          sx={{ mb: '0.25rem' }}
        >
          Logos de l’expéditeur
        </Typography>
      </Row>
      <Row>
        <FileUpload id="fileUploadLogo0" label={null} onUpload={onUpload(0)} />
        <LogoViewer
          index={0}
          logo={props.value[0]}
          onDelete={deleteLogo(props.value[0]?.id, 0)}
        />
      </Row>
      <Row spacing="mb-2w mt-6w">
        <FileUpload
          id="fileUploadLogo1"
          hint=""
          label={null}
          onUpload={onUpload(1)}
        />
        <LogoViewer
          index={1}
          logo={props.value[1]}
          onDelete={deleteLogo(props.value[1]?.id, 1)}
        />
      </Row>
    </Container>
  );
}

export default DraftSenderLogo;
