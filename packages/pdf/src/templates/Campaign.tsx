import React from 'react';
import { Page, View, StyleSheet } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { HousingDTO } from '@zerologementvacant/models';

interface DraftDTO {
  subject?: string | null;
  body: string | null;
  writtenAt?: string | null;
  writtenFrom?: string | null;
}

interface CampaignTemplateProps {
  housing: HousingDTO;
  draft: DraftDTO;
}

export function CampaignTemplate({ draft }: CampaignTemplateProps) {
  return (
    <Page size="A4" style={styles.page}>
      <View>
        {draft.body && <Html>{draft.body}</Html>}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff'
  }
});
