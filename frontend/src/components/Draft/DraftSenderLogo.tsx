import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { FileUploadDTO } from '@zerologementvacant/models';
import classNames from 'classnames';

import FileUpload from '~/components/FileUpload/FileUpload';
import styles from './draft.module.scss';
import LogoViewer from './LogoViewer';

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
    <Stack
      component="section"
      className={classNames(styles.article, props.className)}
    >
      <Stack>
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
          logo={props.value[0]}
          onDelete={deleteLogo(props.value[0]?.id, 0)}
        />
      </Stack>
      <Stack sx={{ mb: 2, mt: 6 }}>
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
      </Stack>
    </Stack>
  );
}

export default DraftSenderLogo;
