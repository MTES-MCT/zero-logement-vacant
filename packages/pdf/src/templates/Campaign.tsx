import { Image, Page, StyleSheet } from '@react-pdf/renderer';
import type {
  DraftDTO,
  HousingDTO,
  OwnerDTO
} from '@zerologementvacant/models';
import Html from 'react-pdf-html';

import { Stack, Typography } from '../components/index.js';

interface CampaignTemplateProps {
  draft: Pick<
    DraftDTO,
    'subject' | 'body' | 'logo' | 'sender' | 'writtenAt' | 'writtenFrom'
  >;
  housing: HousingDTO;
  owner: OwnerDTO;
}

export function CampaignTemplate({ draft, owner }: CampaignTemplateProps) {
  return (
    <Page size="A4" style={styles.page}>
      <Stack direction="row" style={{ justifyContent: 'space-between' }}>
        <Stack direction="row">
          {draft.logo?.map((logo) => (
            <Image src={logo.url} />
          ))}
        </Stack>

        <Stack direction="column" style={{ alignItems: 'flex-end' }}>
          <Typography>{draft.sender.name}</Typography>
          <Typography>{draft.sender.service}</Typography>
          <Typography>
            {draft.sender.firstName} {draft.sender.lastName}
          </Typography>
          <Typography>{draft.sender.email}</Typography>
          <Typography>{draft.sender.phone}</Typography>
        </Stack>
      </Stack>

      <Stack
        style={{
          transform: 'translateX(300vw)'
        }}
      >
        <Typography style={{ marginBottom: 10, fontWeight: 700 }}>
          À l’attention de
        </Typography>
        <Typography>{owner.fullName}</Typography>
        <Typography>{owner.additionalAddress}</Typography>
        <Typography>{owner.banAddress?.label}</Typography>
      </Stack>

      <Stack direction="column" spacing="1rem">
        <Typography>
          À {draft.writtenFrom}, le {draft.writtenAt}
        </Typography>

        <Stack direction="row">
          <Typography style={{ fontWeight: 700 }}>Objet : </Typography>
          <Typography>{draft.subject}</Typography>
        </Stack>

        {draft.body && <Html style={{ fontSize: 10 }}>{draft.body}</Html>}

        <Stack
          direction="row"
          style={{ justifyContent: 'flex-end', marginTop: 32 }}
        >
          {draft.sender.signatories?.map((signatory, index) => (
            <Stack key={index}>
              <Typography>
                {signatory?.firstName} {signatory?.lastName}
              </Typography>
              <Typography>{signatory?.role}</Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    paddingVertical: 32,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    rowGap: '3rem'
  }
});
