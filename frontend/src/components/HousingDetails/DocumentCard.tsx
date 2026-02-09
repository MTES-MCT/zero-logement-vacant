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
  /**
   * Display mode of the card.
   * 'compact' only provides document removal.
   * 'detailed' shows all action buttons.
   * @default 'all'
   */
  actions?: 'remove-only' | 'all';
  onDelete(document: DocumentDTO): void;
  onDownload(document: DocumentDTO): Promise<void>;
  onRename(document: DocumentDTO): void;
  onVisualize(index: number): void;
}

const FullWidthButton = styled(Button)({
  width: '100% !important'
});
const FullWidthCenteredButton = styled(FullWidthButton)({
  justifyContent: 'center'
});

function DocumentCard(props: Readonly<DocumentCardProps>) {
  const actions = props.actions ?? 'all';
  const size = prettyBytes(props.document.sizeBytes, {
    locale: 'fr',
    space: true
  });
  const contentType = mime
    .getExtension(props.document.contentType)
    ?.toUpperCase();

  const { isUsual, isAdmin, establishment } = useUser();
  const sameEstablishment: boolean =
    establishment?.id === props.document.establishmentId;
  const canWrite: boolean = isAdmin || (isUsual && sameEstablishment);

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
        {actions === 'all' ? (
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

                {canWrite ? (
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
                {canWrite ? (
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
        ) : null}

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
            fit="contain"
            fallbackProps={{
              size: 'sm'
            }}
            onClick={onVisualize}
          />
        </Box>

        <Stack component="section" spacing="0.5rem" useFlexGap>
          <Typography
            sx={{
              fontWeight: 500,
              color: fr.colors.decisions.text.title.grey.default,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
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

        <Stack component="footer">
          {canWrite && actions === 'remove-only' ? (
            <FullWidthCenteredButton
              priority="tertiary"
              iconId="ri-delete-bin-line"
              size="small"
              title={`Supprimer ${props.document.filename}`}
              nativeButtonProps={{
                'aria-label': `Supprimer ${props.document.filename}`
              }}
              onClick={onDelete}
            >
              Supprimer
            </FullWidthCenteredButton>
          ) : null}
        </Stack>
      </Stack>
    </>
  );
}

export default DocumentCard;
