import Pictures from '@codegouvfr/react-dsfr/picto/Pictures';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';

import { type Housing } from '~/models/Housing';
import { useListHousingDocumentsQuery } from '~/services/document.service';
import HousingDocumentUpload from '../FileUpload/HousingDocumentUpload';
import DocumentCard from './DocumentCard';

interface DocumentsTabProps {
  housing: Housing;
}

function DocumentsTab(props: DocumentsTabProps) {
  const {
    data: documents,
    isLoading,
    isSuccess
  } = useListHousingDocumentsQuery(props.housing.id);

  return (
    <Stack component="section" spacing="2rem" useFlexGap>
      <Stack component="header">
        <HousingDocumentUpload housing={props.housing} />
      </Stack>

      {match({ documents, isLoading, isSuccess })
        .returnType<ReactNode>()
        .with({ isSuccess: true, documents: [] }, () => (
          <Stack
            component="section"
            spacing="0.75rem"
            useFlexGap
            sx={{ alignItems: 'center', textAlign: 'center' }}
          >
            <Pictures width="7.5rem" height="7.5rem" />
            <Typography
              component="p"
              variant="subtitle2"
              sx={{ fontWeight: 500, width: '17rem' }}
            >
              Il n’y a pas de document associé à ce logement
            </Typography>
          </Stack>
        ))
        .with(
          {
            isSuccess: true,
            documents: [Pattern.any, ...Pattern.array(Pattern.any)]
          },
          ({ documents }) => (
            <Grid container spacing="1rem">
              {documents.map((document) => (
                <Grid key={document.id} size={{ xs: 12, md: 4 }}>
                  <DocumentCard document={document} />
                </Grid>
              ))}
            </Grid>
          )
        )
        .otherwise(() => null)}
    </Stack>
  );
}

export default DocumentsTab;
