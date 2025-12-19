import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import DocumentPicto from '@codegouvfr/react-dsfr/picto/Document';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { type DocumentDTO, isImage, isPDF } from '@zerologementvacant/models';
import { memo, useCallback, useState } from 'react';
import { Page, pdfjs, Document as UnstyledDocument } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { match } from 'ts-pattern';

import Image from '~/components/Image/Image';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface DocumentPreviewProps {
  className?: string;
  document: DocumentDTO;
  firstPageOnly?: boolean;
  responsive?: 'max-width' | 'max-height';
  onClick?(): void;
  onDownload?(): void;
}

const PreviewButton = styled('button')({
  width: '100%',
  height: '100%',
  padding: 0,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  display: 'block',
  '& > *': {
    pointerEvents: 'none'
  },
  '&:hover': {
    opacity: 0.8
  },
  '&:focus-visible': {
    outline: `2px solid ${fr.colors.decisions.border.default.blueFrance.default}`,
    outlineOffset: '2px'
  }
});

function DocumentPreview(props: DocumentPreviewProps) {
  const Preview = match(props.document)
    .when(isImage, (image) => (
      <Image
        className={props.className}
        responsive={props.responsive}
        fit="contain"
        src={image.url}
        alt={image.filename}
      />
    ))
    .when(isPDF, (pdf) => (
      <PDF
        url={pdf.url}
        firstPageOnly={props.firstPageOnly}
        responsive={props.responsive}
      />
    ))
    .otherwise(() => (
      <Fallback className={props.className} onDownload={props.onDownload} />
    ));

  const isSupported = isImage(props.document) || isPDF(props.document);

  if (props.onClick && isSupported) {
    return (
      <PreviewButton
        className={props.className}
        onClick={props.onClick}
        aria-label={`Visualiser ${props.document.filename}`}
      >
        {Preview}
      </PreviewButton>
    );
  }

  return Preview;
}

const Document = styled(UnstyledDocument)({
  width: '100%',
  overflow: 'auto'
});

export type PDFProps = Pick<
  DocumentPreviewProps,
  'firstPageOnly' | 'responsive' | 'className'
> & {
  url: string;
};

const PDF = memo((props: Readonly<PDFProps>) => {
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  const containerRef = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      setContainerWidth(element.getBoundingClientRect().width);
    }
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <Document
      className={props.className}
      file={{ url: props.url }}
      inputRef={containerRef}
      loading={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            p: 2
          }}
        >
          <CircularProgress />
        </Box>
      }
      onLoadSuccess={onDocumentLoadSuccess}
    >
      {props.firstPageOnly ? (
        <Page pageIndex={0} width={containerWidth ?? undefined} />
      ) : (
        Array.from(new Array(numPages), (_, index) => (
          <Page
            key={`page_${index}`}
            pageIndex={index}
            width={containerWidth ?? undefined}
          />
        ))
      )}
    </Document>
  );
});
PDF.displayName = 'PDF';

function Fallback(
  props: Pick<DocumentPreviewProps, 'className' | 'onDownload'>
) {
  return (
    <Box component="section" className={props.className}>
      <Paper
        elevation={0}
        sx={{ padding: '2rem', maxWidth: '23.75rem', textAlign: 'center' }}
      >
        <Stack spacing="1rem" useFlexGap sx={{ alignItems: 'center' }}>
          <DocumentPicto width="5rem" height="5rem" />
          <Typography variant="h6" component="p">
            La visualisation de ce document n’est pas disponible
          </Typography>
          <Typography>
            Le format de ce document ne permet pas de la visualiser.
            Téléchargez-le directement pour le consulter.
          </Typography>
          {props.onDownload ? (
            <Button
              priority="secondary"
              iconId="fr-icon-download-line"
              onClick={props.onDownload}
            >
              Télécharger le document
            </Button>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  );
}

export default memo(DocumentPreview);
