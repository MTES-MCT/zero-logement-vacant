import React from 'react';
import { renderToStream, Document } from '@react-pdf/renderer';
import { Readable } from 'stream';
import { CampaignTemplate } from '../templates/Campaign';
import type { HousingDTO, DraftDTO } from '@zerologementvacant/models';
import { replaceVariables } from '@zerologementvacant/models';

interface GenerateCampaignOptions {
  housings: HousingDTO[];
  draft: Pick<DraftDTO, 'subject' | 'body' | 'writtenAt' | 'writtenFrom'>;
}

export async function generate(options: GenerateCampaignOptions) {
  const { housings, draft } = options;

  const nodeStream = await renderToStream(
    <Document>
      {housings.map(housing => {
        // Replace variables for each housing
        const personalizedBody = replaceVariables(draft.body ?? '', {
          housing,
          owner: housing.owner ?? { fullName: '' }
        });

        // Create personalized draft
        const personalizedDraft = {
          ...draft,
          body: personalizedBody
        };

        return (
          <CampaignTemplate
            key={housing.id}
            draft={personalizedDraft}
          />
        );
      })}
    </Document>
  );

  return Readable.toWeb(nodeStream as unknown as Readable);
}
