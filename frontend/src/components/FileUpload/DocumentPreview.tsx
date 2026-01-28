import { fr } from '@codegouvfr/react-dsfr';
import { Button } from '@codegouvfr/react-dsfr/Button';
import DocumentPicto from '@codegouvfr/react-dsfr/picto/Document';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper, { type PaperProps } from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import { type DocumentDTO, isImage, isPDF } from '@zerologementvacant/models';
import { memo, useMemo, useState } from 'react';
import { Page, pdfjs, Document as UnstyledDocument } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useMeasure } from 'react-use';
import { match } from 'ts-pattern';

import Image from '~/components/Image/Image';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface DocumentPreviewProps {
  document: Pick<DocumentDTO, 'filename' | 'contentType' | 'url'>;
  className?: string;
  firstPageOnly?: boolean;
  /**
   * @default undefined
   */
  responsive?: 'max-width' | 'max-height' | '1x1';
  /**
   * @default 'contain'
   */
  fit?: 'contain' | 'cover';
  fallbackProps?: FallbackProps;
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
    .when(isImage, () => (
      <Image
        className={props.className}
        responsive={props.responsive}
        fit={fit}
        src={props.document.url}
        alt={props.document.filename}
      />
    ))
    .when(isPDF, () => (
      <PDF
        url={props.document.url}
        firstPageOnly={props.firstPageOnly}
        responsive={props.responsive}
        fit={fit}
      />
    ))
    .otherwise(() => (
      <Fallback
        {...props.fallbackProps}
        className={props.className}
        onDownload={props.onDownload}
      />
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
    overflow: enableScroll ? 'auto' : fit === 'cover' ? 'hidden' : 'visible',
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
  const file = useMemo(() => ({ url: props.url }), [props.url]);

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
      file={file}
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

interface FallbackProps {
  /**
   * @default 'md'
   */
  size?: 'sm' | 'md';
}

function Fallback(
  props: Readonly<
    FallbackProps & Pick<DocumentPreviewProps, 'className' | 'onDownload'>
  >
) {
  const size = props.size ?? 'md';
  const paperProps: PaperProps =
    size === 'sm'
      ? {
          sx: {
            px: '0.5rem',
            py: '1rem',
            maxWidth: '23.75rem',
            textAlign: 'center'
          }
        }
      : {
          sx: {
            padding: '2rem',
            maxWidth: '23.75rem',
            textAlign: 'center'
          }
        };
  const titleProps: TypographyProps = {
    color: fr.colors.decisions.text.title.grey.default,
    component: 'p',
    variant: size === 'sm' ? 'body2' : 'h6',
    sx:
      size === 'sm'
        ? {
            fontWeight: 700
          }
        : undefined
  };
  const descriptionProps: TypographyProps =
    size === 'sm'
      ? {
          variant: 'caption'
        }
      : {};

  return (
    <Box component="section" className={props.className}>
      <Paper {...paperProps} elevation={0}>
        <Stack spacing="1rem" useFlexGap sx={{ alignItems: 'center' }}>
          <DocumentPicto width="5rem" height="5rem" />
          <Typography {...titleProps}>
            La visualisation de ce document n’est pas disponible
          </Typography>
          <Typography {...descriptionProps}>
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
