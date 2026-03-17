import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Return an actual font file path so @react-pdf/renderer can read it via fs in tests.
// All font imports map to Marianne-Regular — sufficient for PDF validity checks.
export default require.resolve(
  '@codegouvfr/react-dsfr/dsfr/fonts/Marianne-Regular.woff'
);
