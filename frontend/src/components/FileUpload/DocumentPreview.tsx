import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type DocumentDTO, isImage, isPDF } from '@zerologementvacant/models';
import { memo, useCallback, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { match } from 'ts-pattern';

import Image from '~/components/Image/Image';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface DocumentPreviewProps {
  document: DocumentDTO;
}

function DocumentPreview(props: DocumentPreviewProps) {
  return match(props.document)
    .when(isImage, (image) => (
      <Image responsive="1x1" src={image.url} alt={image.filename} />
    ))
    .when(isPDF, (pdf) => <PDF url={pdf.url} />)
    .otherwise(() => <Fallback />);
}

const PDF = memo(({ url }: Readonly<{ url: string }>) => {
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
    <Stack>
      <Stack
        ref={containerRef}
        sx={{
          width: '100%',
          aspectRatio: '1 / 1',
          overflow: 'scroll'
        }}
      >
        <Document
          file={{ url }}
          onLoadSuccess={onDocumentLoadSuccess}
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
        >
          {numPages &&
            Array.from(new Array(numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={containerWidth ?? undefined}
              />
            ))}
        </Document>
      </Stack>
    </Stack>
  );
});
PDF.displayName = 'PDF';

function Fallback() {
  return (
    <Stack>
      <Typography>Prévisualisation indisponible</Typography>
    </Stack>
  );
}

export default memo(DocumentPreview);
