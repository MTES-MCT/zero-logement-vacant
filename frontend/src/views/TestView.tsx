import Container from '@mui/material/Container';
import { Document, PDFViewer } from '@react-pdf/renderer';
import { HousingTemplate } from '@zerologementvacant/pdf';

import { toHousingDTO } from '~/models/Housing';
import { useFindHousingQuery } from '~/services/housing.service';

export default function TestView() {
  const { data: housings } = useFindHousingQuery({
    filters: {},
    pagination: {
      paginate: true,
      page: 1,
      perPage: 3
    }
  });

  if (!housings) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ height: '100vh' }}>
      <PDFViewer showToolbar={false} height="100%" width="100%">
        <Document pageLayout="singlePage">
          {housings?.entities?.map((housing) => (
            <HousingTemplate key={housing.id} housing={toHousingDTO(housing)} />
          ))}
        </Document>
      </PDFViewer>
    </Container>
  );
}
