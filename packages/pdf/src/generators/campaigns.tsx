import React from 'react';
import { renderToStream, Document } from '@react-pdf/renderer';
import { Readable } from 'stream';
import { CampaignTemplate } from '../templates/Campaign';
import type { HousingDTO } from '@zerologementvacant/models';

interface DraftDTO {
  subject?: string | null;
  body: string | null;
  writtenAt?: string | null;
  writtenFrom?: string | null;
}

interface GenerateCampaignOptions {
  housings: HousingDTO[];
  draft: DraftDTO;
}

/**
 * Replace template variables in string.
 * Simple implementation - enhance with existing utility later.
 */
function replaceVariables(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = path.split('.').reduce((obj: any, key: string) => obj?.[key], data);
    return value ?? match;
  });
}

export async function generate(options: GenerateCampaignOptions): Promise<ReadableStream> {
  const { housings, draft } = options;

  const nodeStream = await renderToStream(
    <Document>
      {housings.map(housing => {
        // Replace variables for each housing
        const personalizedBody = replaceVariables(draft.body ?? '', {
          housing,
          owner: housing.owner
        });

        // Create personalized draft
        const personalizedDraft = {
          ...draft,
          body: personalizedBody
        };

        return (
          <CampaignTemplate
            key={housing.id}
            housing={housing}
            draft={personalizedDraft}
          />
        );
      })}
    </Document>
  );

  return Readable.toWeb(nodeStream) as ReadableStream;
}
