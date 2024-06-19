import { Container, Row } from '../_dsfr';
import FileUpload from '../FileUpload/FileUpload';
import styles from './draft.module.scss';
import { FileUploadDTO } from '@zerologementvacant/models';
import classNames from 'classnames';
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
      const newFiles = [...files].filter(file => file?.id !== id);
      props.onChange(newFiles);
      const elem = document.getElementById(`fileUploadLogo${index}-input`) as HTMLInputElement;
      if(elem !== null) {
        elem.value = '';
      }
    };
  }

  return (
    <Container
      as="section"
      className={classNames(styles.article, props.className)}
      fluid
    >
      <Row>
        <FileUpload
          id='fileUploadLogo0'
          label={<h6 className="fr-mb-2w">Logos de l’expéditeur</h6>}
          onUpload={onUpload(0)}
        />
        <LogoViewer index={0} logo={props.value[0]} onDelete={deleteLogo(props.value[0]?.id, 0)} />
      </Row>
      <Row spacing="mb-2w">
        <FileUpload id='fileUploadLogo1' hint="" label={null} onUpload={onUpload(1)} />
        <LogoViewer index={1} logo={props.value[1]} onDelete={deleteLogo(props.value[1]?.id, 1)} />
      </Row>
    </Container>
  );
}

export default DraftSenderLogo;
