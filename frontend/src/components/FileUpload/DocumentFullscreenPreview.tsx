import Container from '@mui/material/Container';
import Modal, { type ModalProps } from '@mui/material/Modal';
import Stack from '@mui/material/Stack';
import type { DocumentDTO } from '@zerologementvacant/models';

import DocumentCyclingBar from './DocumentCyclingBar';
import DocumentPreview from './DocumentPreview';
import { styled } from '@mui/material/styles';
import { Button } from '@codegouvfr/react-dsfr/Button';
import Paper from '@mui/material/Paper';

const CenteredDocumentPreview = styled(DocumentPreview)({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
});

type ExtractedModalProps = 'open';

export type DocumentFullscreenPreviewProps = Pick<
  ModalProps,
  ExtractedModalProps
> & {
  documents: ReadonlyArray<DocumentDTO>;
  modalProps?: Omit<ModalProps, ExtractedModalProps>;
  index: number;
  onClose(): void;
  onIndexChange(index: number): void;
  onDownload?(document: DocumentDTO): void;
};

function DocumentFullscreenPreview(
  props: Readonly<DocumentFullscreenPreviewProps>
) {
  const { documents, index, modalProps, onDownload, onIndexChange, ...rest } =
    props;

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
    <Modal {...modalProps} {...rest} role="dialog">
      <Container
        maxWidth="xl"
        sx={{ padding: '1.5rem', pb: '3rem', height: '100vh' }}
      >
        <Paper
          sx={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            padding: '0.75rem'
          }}
        >
          <Button
            priority="tertiary no outline"
            iconId="fr-icon-close-line"
            size="small"
            onClick={() => {
              props.onClose();
            }}
          >
            Fermer
          </Button>
        </Paper>

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
            fit="contain"
            onDownload={() => onDownload?.(currentDocument)}
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
