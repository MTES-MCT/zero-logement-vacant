import React from 'react';
import { Page, View, StyleSheet } from '@react-pdf/renderer';
import Html from 'react-pdf-html';
import type { DraftDTO } from '@zerologementvacant/models';

interface CampaignTemplateProps {
  draft: Pick<DraftDTO, 'subject' | 'body' | 'writtenAt' | 'writtenFrom'>;
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
