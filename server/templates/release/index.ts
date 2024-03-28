import fs from 'node:fs';
import path from 'node:path';

const file = path.join(__dirname, 'release.hbs');
const RELEASE_TEMPLATE_FILE = fs.readFileSync(file, 'utf8');

export default RELEASE_TEMPLATE_FILE;
