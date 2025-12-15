import Container from '@mui/material/Container';
import Modal, { type ModalProps } from '@mui/material/Modal';
import Stack from '@mui/material/Stack';
import type { DocumentDTO } from '@zerologementvacant/models';

import DocumentCyclingBar from './DocumentCyclingBar';
import DocumentPreview from './DocumentPreview';
import { styled } from '@mui/material/styles';

const CenteredDocumentPreview = styled(DocumentPreview)({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
});

type ExtractedModalProps = 'open' | 'onClose';

export type DocumentFullscreenPreviewProps = Pick<
  ModalProps,
  ExtractedModalProps
> & {
  documents: DocumentDTO[];
  modalProps?: Omit<ModalProps, ExtractedModalProps>;
  index: number;
  onIndexChange(index: number): void;
  onDownload?(document: DocumentDTO): void;
};

function DocumentFullscreenPreview(
  props: Readonly<DocumentFullscreenPreviewProps>
) {
  const { documents, index, onIndexChange, ...modalProps } = props;

  const currentDocument = documents[index];

  function onPrevious(): void {
    onIndexChange((index - 1 + documents.length) % documents.length);
  }

  function onNext(): void {
    onIndexChange((index + 1) % documents.length);
  }

  if (!currentDocument) {
    return null;
  }

  return (
    <Modal {...modalProps}>
      <Container
        maxWidth={false}
        sx={{ padding: '1.5rem', pb: '3rem', height: '100vh' }}
      >
        <Stack
          spacing="1.5rem"
          sx={{
            alignItems: 'center',
            height: '100%'
          }}
        >
          <CenteredDocumentPreview
            document={currentDocument}
            responsive="max-height"
            onDownload={() => props.onDownload?.(currentDocument)}
          />
          {documents.length > 1 && (
            <DocumentCyclingBar
              index={index}
              total={documents.length}
              onPrevious={onPrevious}
              onNext={onNext}
            />
          )}
        </Stack>
      </Container>
    </Modal>
  );
}

export default DocumentFullscreenPreview;
