import { fr } from '@codegouvfr/react-dsfr';
import { faker } from '@faker-js/faker';
import ReactPDF, {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View
} from '@react-pdf/renderer';
import path from 'node:path';

const colors = fr.colors.getHex({ isDark: false });

Font.register({
  family: 'Marianne',
  fontStyle: 'normal',
  fontWeight: 'normal',
  src: path.join(
    import.meta.dirname,
    '..',
    'node_modules',
    '@gouvfr',
    'dsfr',
    'dist',
    'fonts',
    'Marianne-Regular.woff2'
  )
});

// Create styles
const styles = StyleSheet.create({
  page: {
    color: colors.decisions.text.default.grey.default,
    backgroundColor: colors.decisions.background.default.grey.default,
    fontFamily: 'Marianne',
    fontSize: '10pt',
    padding: '10pt'
  },
  section: {
    margin: '10pt'
  }
});

// Create Document Component
const MyDocument = () => (
  <Document>
    <Page size="A4" dpi={300} style={styles.page}>
      <View style={styles.section}></View>
      <View style={styles.section}>
        <Text>{faker.lorem.paragraphs(20)}</Text>
      </View>
    </Page>
  </Document>
);

async function render() {
  await ReactPDF.renderToFile(
    <MyDocument />,
    path.join(import.meta.dirname, 'example.pdf')
  );
}

render();
