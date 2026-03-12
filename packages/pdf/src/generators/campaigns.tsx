import { Document, renderToStream } from '@react-pdf/renderer';
import type { DraftDTO, HousingDTO } from '@zerologementvacant/models';
import { replaceVariables } from '@zerologementvacant/models';
import { Readable } from 'node:stream';

import { CampaignTemplate } from '../templates/Campaign.js';

interface GenerateCampaignOptions {
  housings: Array<
    Omit<HousingDTO, 'owner'> & { owner: NonNullable<HousingDTO['owner']> }
  >;
  draft: DraftDTO;
}

export async function generate(options: GenerateCampaignOptions) {
  const { housings, draft } = options;

  const nodeStream = await renderToStream(
    <Document>
      {housings.map((housing) => {
        // Replace variables for each housing
        const personalizedBody = replaceVariables(draft.body ?? '', {
          housing,
          owner: housing.owner ?? { fullName: '' }
        });

        // Create personalized draft
        const personalizedDraft: DraftDTO = {
          ...draft,
          body: personalizedBody
        };

        return (
          <CampaignTemplate
            key={housing.id}
            draft={personalizedDraft}
            housing={housing}
            owner={housing.owner}
          />
        );
      })}
    </Document>
  );

  return Readable.toWeb(nodeStream as unknown as Readable);
}