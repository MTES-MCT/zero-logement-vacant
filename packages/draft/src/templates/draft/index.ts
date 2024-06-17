import fs from 'node:fs';
import path from 'node:path';

const file = path.join(__dirname, 'draft.hbs');
export const DRAFT_TEMPLATE_FILE = fs.readFileSync(file, 'utf8');

export interface DraftData {
  watermark?: boolean;
  subject: string | null;
  body: string | null;
  logo: string[] | null;
  sender: {
    name: string | null;
    service: string | null;
    firstName: string | null;
    lastName: string | null;
    address: string | null;
    phone: string | null;
    signatoryFile: string | null;
    signatoryFirstName: string | null;
    signatoryLastName: string | null;
    signatoryRole: string | null;
  } | null;
  writtenFrom: string | null;
  writtenAt: string | null;
  owner: {
    fullName: string;
    address: string[];
  };
}
