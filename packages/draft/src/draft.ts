import fs from 'node:fs';
import path from 'node:path';

const file = path.join(__dirname, 'templates', 'draft', 'draft.hbs');
export const DRAFT_TEMPLATE_FILE = fs.readFileSync(file, 'utf8');

export interface DraftData {
  watermark?: boolean;
  subject: string | null;
  body: string | null;
  logo: File[] | null;
  sender: {
    name: string | null;
    service: string | null;
    firstName: string | null;
    lastName: string | null;
    address: string | null;
    email: string | null;
    phone: string | null;
    signatories: Signatory[] | null;
  } | null;
  writtenFrom: string | null;
  writtenAt: string | null;
  owner: {
    fullName: string;
    address: string[];
  };
}

interface Signatory {
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  file: File | null;
}

interface File {
  id: string;
  content: string;
}
