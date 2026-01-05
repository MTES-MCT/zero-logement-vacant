import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import styled from '@emotion/styled';
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
  index: number;
  onDelete(document: DocumentDTO): void;
  onDownload(document: DocumentDTO): Promise<void>;
  onRename(document: DocumentDTO): void;
  onVisualize(index: number): void;
}

const FullWidthButton = styled(Button)({
  width: '100% !important'
});

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

  function onDelete(): void {
    setDropdownOpen(false);
    props.onDelete(props.document);
  }

  async function onDownload(): Promise<void> {
    setDropdownOpen(false);
    props.onDownload(props.document);
  }

  function onVisualize(): void {
    setDropdownOpen(false);
    props.onVisualize(props.index);
  }

  return (
    <>
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
            <Stack spacing="0.5rem" useFlexGap sx={{ p: '1rem' }}>
              <FullWidthButton
                priority="tertiary no outline"
                iconId="fr-icon-eye-line"
                size="small"
                onClick={onVisualize}
              >
                Visualiser
              </FullWidthButton>

              {isUsual || isAdmin ? (
                <FullWidthButton
                  priority="tertiary no outline"
                  iconId="fr-icon-edit-fill"
                  size="small"
                  onClick={onRename}
                >
                  Renommer
                </FullWidthButton>
              ) : null}
              <FullWidthButton
                priority="tertiary no outline"
                iconId="fr-icon-download-line"
                size="small"
                onClick={onDownload}
              >
                Télécharger
              </FullWidthButton>
              {isUsual || isAdmin ? (
                <FullWidthButton
                  priority="tertiary no outline"
                  iconId="ri-delete-bin-line"
                  size="small"
                  onClick={onDelete}
                >
                  Supprimer
                </FullWidthButton>
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
          <DocumentPreview
            key={props.document.id}
            document={props.document}
            firstPageOnly
            responsive="1x1"
            fit="cover"
            onClick={onVisualize}
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
    </>
  );
}

export default DocumentCard;
