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
import { memo, useState } from 'react';
import { Page, pdfjs, Document as UnstyledDocument } from 'react-pdf';
import { useMeasure } from 'react-use';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { match } from 'ts-pattern';

import Image from '~/components/Image/Image';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface DocumentPreviewProps {
  className?: string;
  document: DocumentDTO;
  firstPageOnly?: boolean;
  /**
   * @default undefined
   */
  responsive?: 'max-width' | 'max-height' | '1x1';
  /**
   * @default 'contain'
   */
  fit?: 'contain' | 'cover';
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
  const fit = props.fit ?? 'contain';

  const Preview = match(props.document)
    .when(isImage, (image) => (
      <Image
        className={props.className}
        responsive={props.responsive}
        fit={fit}
        src={image.url}
        alt={image.filename}
      />
    ))
    .when(isPDF, (pdf) => (
      <PDF
        url={pdf.url}
        firstPageOnly={props.firstPageOnly}
        responsive={props.responsive}
        fit={fit}
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

const Document = styled(UnstyledDocument)<{
  enableScroll?: boolean;
  responsive?: string;
  fit?: string;
}>(({ enableScroll, responsive, fit }) => {
  const baseStyles = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: enableScroll ? 'auto' : (fit === 'cover' ? 'hidden' : 'visible'),
    '& .react-pdf__Page': {
      display: 'flex',
      justifyContent: 'center'
    }
  };

  if (responsive === '1x1') {
    return {
      ...baseStyles,
      width: '100%',
      aspectRatio: 1
    };
  }

  if (responsive === 'max-height') {
    return {
      ...baseStyles,
      width: '100%',
      height: '100%',
      maxHeight: '100%'
    };
  }

  return {
    ...baseStyles,
    width: '100%',
    maxWidth: '100%'
  };
});

export type PDFProps = Pick<
  DocumentPreviewProps,
  'firstPageOnly' | 'responsive' | 'fit' | 'className'
> & {
  url: string;
};

const PDF = memo((props: Readonly<PDFProps>) => {
  const [containerRef, { width, height }] = useMeasure<HTMLDivElement>();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageAspectRatio, setPageAspectRatio] = useState<number | null>(null);

  const onPageLoadSuccess = (page: any) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageAspectRatio(viewport.width / viewport.height);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const calculateCanvasDimensions = (): { width?: number; height?: number } => {
    const { responsive, fit } = props;

    if (!width || !pageAspectRatio) {
      return { width: width || undefined };
    }

    // max-width mode (current behavior)
    if (responsive === 'max-width' || !responsive) {
      return { width };
    }

    // max-height mode - use height to constrain, let width auto-calculate
    if (responsive === 'max-height') {
      if (!height) return { width };
      // Calculate which dimension to constrain based on container vs page aspect ratio
      const containerAspectRatio = width / height;

      if (pageAspectRatio > containerAspectRatio) {
        // Page is wider than container - constrain by width
        return { width };
      } else {
        // Page is taller than container - constrain by height
        return { height };
      }
    }

    // 1x1 aspect ratio mode
    if (responsive === '1x1') {
      const containerAspectRatio = 1;

      if (fit === 'cover') {
        // Fill container, potentially cropping
        if (pageAspectRatio > containerAspectRatio) {
          // Page wider than container - use height to fill
          return { height: width }; // Square: width = height
        } else {
          // Page taller - use width to fill
          return { width };
        }
      } else {
        // fit === 'contain' - show entire page
        if (pageAspectRatio > containerAspectRatio) {
          // Page wider - constrain by width
          return { width };
        } else {
          // Page taller - constrain by height
          return { height: width }; // Square: width = height
        }
      }
    }

    return { width };
  };

  const canvasDimensions = calculateCanvasDimensions();
  const shouldRenderSinglePage = props.firstPageOnly || props.fit === 'cover';
  const enableScroll = !shouldRenderSinglePage;

  return (
    <Document
      className={props.className}
      file={{ url: props.url }}
      inputRef={containerRef}
      enableScroll={enableScroll}
      responsive={props.responsive}
      fit={props.fit}
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
      {shouldRenderSinglePage ? (
        <Page
          pageIndex={0}
          {...canvasDimensions}
          onLoadSuccess={onPageLoadSuccess}
        />
      ) : (
        Array.from(new Array(numPages), (_, index) => (
          <Page
            key={`page_${index}`}
            pageIndex={index}
            {...canvasDimensions}
            onLoadSuccess={index === 0 ? onPageLoadSuccess : undefined}
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
