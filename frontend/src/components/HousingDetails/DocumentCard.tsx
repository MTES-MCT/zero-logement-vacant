import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DocumentDTO } from '@zerologementvacant/models';
import mime from 'mime';
import prettyBytes from 'pretty-bytes';
import { useState } from 'react';

import Dropdown from '~/components/Dropdown/Dropdown';
import DocumentPreview from '~/components/FileUpload/DocumentPreview';
import { useUser } from '~/hooks/useUser';

export interface DocumentCardProps {
  document: DocumentDTO;
  onRename(document: DocumentDTO): void;
}

function DocumentCard(props: Readonly<DocumentCardProps>) {
  const size = prettyBytes(props.document.sizeBytes, {
    locale: 'fr',
    space: true
  });
  const contentType = mime
    .getExtension(props.document.contentType)
    ?.toUpperCase();

  const { isUsual, isAdmin } = useUser();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  function onOpen(): void {
    setDropdownOpen(true);
  }

  function onRename(): void {
    setDropdownOpen(false);
    props.onRename(props.document);
  }

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
        component="header"
        sx={{ display: 'flex', justifyContent: 'flex-end' }}
      >
        <Dropdown
          label="Options"
          buttonProps={{ size: 'small' }}
          popoverProps={{
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'right'
            },
            transformOrigin: {
              vertical: 'top',
              horizontal: 'right'
            }
          }}
          open={dropdownOpen}
          onOpen={onOpen}
        >
          <Stack spacing="0.5rem" useFlexGap sx={{ px: '1.5rem', py: '1rem' }}>
            {isUsual || isAdmin ? (
              <Button
                priority="tertiary no outline"
                iconId="fr-icon-edit-fill"
                size="small"
                onClick={onRename}
              >
                Renommer
              </Button>
            ) : null}
          </Stack>
        </Dropdown>
      </Box>
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
