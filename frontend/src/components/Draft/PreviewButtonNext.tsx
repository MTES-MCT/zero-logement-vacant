import { Button, type ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { CampaignDocument, CampaignPage, usePDF } from '@zerologementvacant/pdf';
import { useEffect } from 'react';
import type { Campaign } from '~/models/Campaign';
import type { Draft } from '~/models/Draft';
import { toHousingDTO } from '~/models/Housing';
import { toOwnerDTO } from '~/models/Owner';
import { useFindHousingQuery } from '~/services/housing.service';

export type PreviewButtonProps = Pick<ButtonProps.AsButton, 'type'> & {
  campaign: Campaign;
  draft: Draft;
};

function PreviewButtonNext(props: Readonly<PreviewButtonProps>) {
  const findHousingsQuery = useFindHousingQuery(
    {
      filters: {
        campaignIds: [props.campaign.id]
      },
      pagination: {
        paginate: true
      }
    },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        data: data?.entities?.filter((housing) => !!housing.owner)?.at(0)
      })
    }
  );

  const housing = findHousingsQuery.data;
  const owner = findHousingsQuery.data?.owner;

  const [pdf, updatePDF] = usePDF({
    document: undefined
  });

  useEffect(() => {
    if (!!housing && !!owner) {
      updatePDF(
        <CampaignDocument campaign={props.campaign}>
          <CampaignPage
            draft={props.draft}
            housing={toHousingDTO(housing)}
            owner={toOwnerDTO(owner)}
          />
        </CampaignDocument>
      );
    }
  }, [housing, owner, props.campaign, props.draft, updatePDF]);

  async function preview() {
    if (pdf.url) {
      window.open(pdf.url, '_blank');
    }
  }

  return (
    <Button
      disabled={findHousingsQuery.isFetching}
      iconId="fr-icon-eye-line"
      priority="secondary"
      onClick={preview}
    >
      Visualiser mon brouillon
    </Button>
  );
}

export default PreviewButtonNext;
