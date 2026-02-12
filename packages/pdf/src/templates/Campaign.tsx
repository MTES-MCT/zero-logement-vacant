import React from 'react';
import { Page, View, StyleSheet, Image } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { DraftDTO, HousingDTO } from '@zerologementvacant/models';
import { Stack, Typography } from '../components';

interface CampaignTemplateProps {
  draft: Pick<
    DraftDTO,
    'subject' | 'body' | 'logo' | 'sender' | 'writtenAt' | 'writtenFrom'
  >;
  housings: ReadonlyArray<HousingDTO>;
}

export function CampaignTemplate({ draft, housings }: CampaignTemplateProps) {
  return (
    <Page size="A4" style={styles.page}>
      <Stack direction="row" style={{ alignItems: 'flex-end' }}>
        <Stack direction="row">
          {draft.logo?.map((logo) => (
            <Image src={Buffer.from(logo.content)} />
          ))}
        </Stack>

        <Stack direction="column" spacing="1rem">
          <Typography variant="h2">{draft.sender.name}</Typography>
          <Typography variant="h3">{draft.sender.service}</Typography>
          <Typography>
            {draft.sender.firstName} {draft.sender.lastName}
          </Typography>
          <Typography>{draft.sender.email}</Typography>
          <Typography>{draft.sender.phone}</Typography>
        </Stack>
      </Stack>

      <Stack direction="column">
        <Typography>
          Écrit à {draft.writtenFrom} le {draft.writtenAt}
        </Typography>

        <Typography variant="h4">{draft.subject}</Typography>

        {draft.body && <Html>{draft.body}</Html>}
      </Stack>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff'
  }
});
