import React from 'react';

import { Col, Container, Row } from '../_dsfr';
import FileUpload from '../FileUpload/FileUpload';
import styles from './draft.module.scss';
import { FileUploadDTO } from '../../../../shared/models/FileUploadDTO';
import Image from '../Image/Image';

interface Props {
  value: string[];
  onChange(value: string[]): void;
}

function DraftSenderLogo(props: Readonly<Props>) {
  const { value: files } = props;

  function onUpload(index: number) {
    return (file: FileUploadDTO): void => {
      const newFiles = [...files];
      newFiles[index] = file.url;
      props.onChange(newFiles);
    };
  }

  return (
    <Container as="section" className={styles.article} fluid>
      <Row>
        <FileUpload
          label={<h6 className="fr-mb-2w">Logos de l’expéditeur</h6>}
          onUpload={onUpload(0)}
        />
      </Row>
      <Row spacing="mb-2w">
        <FileUpload hint="" label={null} onUpload={onUpload(1)} />
      </Row>
      <Container as="section" fluid>
        <Row gutters>
          {files.map((file, i) => (
            <Col>
              <Image alt={`Logo ${i + 1}`} src={file} />
            </Col>
          ))}
        </Row>
      </Container>
    </Container>
  );
}

export default DraftSenderLogo;
