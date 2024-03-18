import fs from 'node:fs';
import path from 'node:path';

const file = path.join(__dirname, 'draft.hbs');
const DRAFT_TEMPLATE_FILE = fs.readFileSync(file, 'utf8');

export default DRAFT_TEMPLATE_FILE;
