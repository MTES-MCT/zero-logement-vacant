import { useCallback, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type DocumentDTO, isImage, isPDF } from '@zerologementvacant/models';
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
    .when(isPDF, (pdf) => <PDFPreview url={pdf.url} />)
    .otherwise(() => <Fallback />);
}

function PDFPreview({ url }: { url: string }) {
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  const containerRef = useCallback((element: HTMLDivElement | null) => {
    if (element) {
      setContainerWidth(element.getBoundingClientRect().width);
    }
  }, []);

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
        <Document file={{ url }}>
          <Page pageNumber={1} width={containerWidth ?? undefined} />
        </Document>
      </Stack>
    </Stack>
  );
}

function Fallback() {
  return (
    <Stack>
      <Typography>Prévisualisation indisponible</Typography>
    </Stack>
  );
}

export default DocumentPreview;
