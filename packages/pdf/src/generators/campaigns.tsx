import { renderToStream } from '@react-pdf/renderer';
import type {
  CampaignDTO,
  DraftDTO,
  HousingDTO
} from '@zerologementvacant/models';
import { replaceVariables } from '@zerologementvacant/models';
import { Readable } from 'node:stream';

import { CampaignDocument, CampaignPage } from '../templates/Campaign.js';

export interface GenerateCampaignOptions {
  campaign: CampaignDTO;
  housings: Array<
    Omit<HousingDTO, 'owner'> & { owner: NonNullable<HousingDTO['owner']> }
  >;
  draft: DraftDTO;
}

export async function generate(options: GenerateCampaignOptions) {
  const { campaign, housings, draft } = options;

  const nodeStream = await renderToStream(
    <CampaignDocument campaign={campaign}>
      {housings.map((housing) => {
        const personalizedBody = replaceVariables(draft.body ?? '', {
          housing,
          owner: housing.owner ?? { fullName: '' }
        });

        const personalizedDraft: DraftDTO = {
          ...draft,
          body: personalizedBody
        };

        return (
          <CampaignPage
            key={housing.id}
            draft={personalizedDraft}
            housing={housing}
            owner={housing.owner}
          />
        );
      })}
    </CampaignDocument>
  );

  return Readable.toWeb(nodeStream as unknown as Readable);
}
