import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import MainContainer from '../../components/MainContainer/MainContainer';

function AnalysisView() {
  useDocumentTitle('Analyse');

  const isLoading = true;

  return (
    <MainContainer>
      {isLoading ? <Loading /> : <Typography variant="h1">Analyse</Typography>}
    </MainContainer>
  );
}

function Loading() {
  return (
    <Stack spacing={1} width="100%">
      <Skeleton animation="wave" height={600} variant="rectangular" />
    </Stack>
  );
}

export default AnalysisView;
