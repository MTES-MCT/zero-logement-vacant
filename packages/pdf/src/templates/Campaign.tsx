import { Document, Font, Image, Page, StyleSheet } from '@react-pdf/renderer';
import MarianneBold from '@codegouvfr/react-dsfr/dsfr/fonts/Marianne-Bold.woff';
import MarianneBoldItalic from '@codegouvfr/react-dsfr/dsfr/fonts/Marianne-Bold_Italic.woff';
import MarianneRegular from '@codegouvfr/react-dsfr/dsfr/fonts/Marianne-Regular.woff';
import MarianneRegularItalic from '@codegouvfr/react-dsfr/dsfr/fonts/Marianne-Regular_Italic.woff';
import {
  replaceVariables,
  type CampaignDTO,
  type DraftDTO,
  type HousingDTO,
  type OwnerDTO
} from '@zerologementvacant/models';
import Html from 'react-pdf-html';

import { Stack, Typography } from '~/components/index.js';

export interface CampaignDocumentProps {
  campaign: CampaignDTO;
  children: React.ReactNode;
}

export function CampaignDocument({
  campaign,
  children
}: CampaignDocumentProps) {
  return (
    <Document
      author="Zéro Logement Vacant"
      title={campaign.title}
      subject={campaign.description}
      creationDate={new Date()}
      language="fr"
    >
      {children}
    </Document>
  );
}

export interface CampaignPageProps {
  draft: DraftDTO;
  housing: HousingDTO;
  owner: OwnerDTO;
}

export function CampaignPage({ draft, housing, owner }: CampaignPageProps) {
  const body = draft.body
    ? replaceVariables(draft.body, {
        owner: {
          fullName: owner.fullName
        },
        housing: {
          buildingYear: housing.buildingYear,
          cadastralReference: housing.cadastralReference,
          invariant: housing.invariant,
          localId: housing.localId,
          livingArea: housing.livingArea,
          plotId: housing.plotId,
          rawAddress: housing.rawAddress,
          roomsCount: housing.roomsCount,
          vacancyStartYear: housing.vacancyStartYear,
          energyConsumption: housing.energyConsumption,
          housingKind: housing.housingKind
        }
      })
    : null;

  const writtenAt = draft.writtenAt
    ? new Intl.DateTimeFormat('fr').format(new Date(draft.writtenAt))
    : null;

  return (
    <Page size="A4" style={styles.page}>
      <Stack direction="row">
        <Stack direction="column" spacing="1rem">
          {draft.logoNext
            .filter((logo) => logo !== null)
            .map((logo) => (
              <Image
                key={logo.id}
                src={logo.url}
                style={{ maxWidth: '16rem' }}
              />
            ))}
        </Stack>

        <Stack direction="column" spacing="2rem" style={{ flex: 1 }}>
          <Stack direction="column" style={{ alignItems: 'flex-end' }}>
            <Typography>{draft.sender.name}</Typography>
            <Typography>{draft.sender.service}</Typography>
            <Typography>
              {draft.sender.firstName} {draft.sender.lastName}
            </Typography>
            <Typography>{draft.sender.email}</Typography>
            <Typography>{draft.sender.phone}</Typography>
          </Stack>

          <Stack style={{ alignItems: 'flex-end', marginRight: 96 }}>
            <Typography style={{ marginBottom: 10, fontWeight: 700 }}>
              À l'attention de
            </Typography>
            <Typography>{owner.fullName}</Typography>
            <Typography>{owner.additionalAddress}</Typography>
            <Typography>{owner.banAddress?.label}</Typography>
          </Stack>
        </Stack>
      </Stack>

      <Stack direction="column" spacing="1rem">
        <Typography>
          À {draft.writtenFrom}, le {writtenAt}
        </Typography>

        <Stack direction="row">
          <Typography style={{ fontWeight: 700 }}>Objet : </Typography>
          <Typography>{draft.subject}</Typography>
        </Stack>

        {body && (
          <Html style={{ fontSize: 10 }} collapse={false}>
            {body}
          </Html>
        )}

        <Stack
          direction="row"
          spacing="2rem"
          style={{ justifyContent: 'flex-end', marginTop: 32 }}
        >
          {draft.sender.signatories?.map((signatory, index) => (
            <Stack key={index}>
              <Typography>
                {signatory?.firstName} {signatory?.lastName}
              </Typography>
              <Typography>{signatory?.role}</Typography>

              {signatory?.document?.url ? (
                <Image
                  src={signatory?.document?.url}
                  style={{ marginTop: 16, maxWidth: '16rem' }}
                />
              ) : null}
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Page>
  );
}

Font.register({
  family: 'Marianne',
  fonts: [
    { src: MarianneRegular },
    { src: MarianneRegularItalic, fontStyle: 'italic' },
    { src: MarianneBold, fontWeight: 700 },
    { src: MarianneBoldItalic, fontWeight: 700, fontStyle: 'italic' }
  ]
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Marianne',
    fontSize: 10,
    paddingVertical: 32,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    rowGap: '3rem'
  }
});
