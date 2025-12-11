import prettyBytes from 'pretty-bytes';
import { fr } from '@codegouvfr/react-dsfr';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import mime from 'mime';

import DocumentPreview from '~/components/FileUpload/DocumentPreview';

export interface DocumentCardProps {
  document: DocumentDTO;
}

function DocumentCard(props: Readonly<DocumentCardProps>) {
  const size = prettyBytes(props.document.sizeBytes, {
    locale: 'fr',
    space: true
  });
  const contentType = mime
    .getExtension(props.document.contentType)
    ?.toUpperCase();

  return (
    <Stack
      component="article"
      spacing="1rem"
      useFlexGap
      sx={{
        border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
        padding: '1rem'
      }}
    >
      <Box
        component="section"
        sx={{
          border: `1px solid ${fr.colors.decisions.border.contrast.grey.default}`
        }}
      >
        <DocumentPreview key={props.document.id} document={props.document} />
      </Box>
      <Stack component="footer" spacing="0.5rem" useFlexGap>
        <Typography
          sx={{
            fontWeight: 500,
            color: fr.colors.decisions.text.title.grey.default,
            whiteSpace: 'nowrap',
            overflowY: 'auto'
          }}
        >
          {props.document.filename}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: fr.colors.decisions.text.mention.grey.default }}
        >
          {contentType} — {size}
        </Typography>
      </Stack>
    </Stack>
  );
}

export default DocumentCard;
