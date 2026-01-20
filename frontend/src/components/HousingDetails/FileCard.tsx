import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import mime from 'mime';
import prettyBytes from 'pretty-bytes';

import DocumentPreview from '~/components/FileUpload/DocumentPreview';

const FullWidthButton = styled(Button)({
  width: '100% !important',
  justifyContent: 'center'
});

export interface FileCardProps {
  contentType: string;
  filename: string;
  /**
   * The file size in bytes.
   */
  size: number;
  url: string;
  onRemove(): void;
}

function FileCard(props: Readonly<FileCardProps>) {
  const size = prettyBytes(props.size, {
    locale: 'fr',
    space: true
  });
  const contentType =
    mime.getExtension(props.contentType)?.toUpperCase() ?? 'N/A';

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
        <DocumentPreview
          document={{
            filename: props.filename,
            contentType: props.contentType,
            url: props.url
          }}
          firstPageOnly
          responsive="1x1"
          fit="contain"
          fallbackProps={{
            size: 'sm'
          }}
        />
      </Box>

      <Stack component="footer" spacing="0.5rem" useFlexGap>
        <Typography
          sx={{
            fontWeight: 500,
            color: fr.colors.decisions.text.title.grey.default,
            whiteSpace: 'nowrap',
            overflowY: 'clip',
            textOverflow: 'ellipsis'
          }}
        >
          {props.filename}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: fr.colors.decisions.text.mention.grey.default }}
        >
          {contentType} — {size}
        </Typography>

        <FullWidthButton
          priority="tertiary"
          iconId="ri-delete-bin-line"
          nativeButtonProps={{
            'aria-label': `Supprimer "${props.filename}"`,
            title: `Supprimer "${props.filename}"`
          }}
          onClick={props.onRemove}
        >
          Supprimer
        </FullWidthButton>
      </Stack>
    </Stack>
  );
}

export default FileCard;
