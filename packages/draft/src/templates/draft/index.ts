import fs from 'node:fs';
import path from 'node:path';

const file = path.join(__dirname, 'draft.hbs');
export const DRAFT_TEMPLATE_FILE = fs.readFileSync(file, 'utf8');

export interface DraftData {
  watermark?: boolean;
  subject: string;
  body: string;
  logo: string[];
  sender: {
    name: string;
    service: string;
    firstName: string;
    lastName: string;
    address: string | null;
    phone: string | null;
    signatoryFile: string | null;
    signatoryFirstName: string | null;
    signatoryLastName: string | null;
    signatoryRole: string | null;
  };
  writtenFrom: string;
  writtenAt: string;
  owner: {
    fullName: string;
    address: string[];
  };
}
