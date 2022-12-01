import React from 'react';
import { Text } from '@dataesr/react-dsfr';
import { CampaignBundle } from '../../models/Campaign';
import AppCard from '../AppCard/AppCard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';

interface Props {
    campaignBundle: CampaignBundle,
    isGrey?: boolean
}

const CampaignBundleInfos = ({ campaignBundle, isGrey }: Props) => {

    const { bundle, mainCampaign } = useCampaignBundle(campaignBundle)

    return(
        <>
            {bundle &&
                <>
                    <AppCard icon="ri-home-fill" isGrey={isGrey}>
                        <Text as="span">
                            <b>{bundle.housingCount}</b> {bundle.housingCount <= 1 ? 'logement' : 'logements'}
                        </Text>
                    </AppCard>
                    <AppCard icon="ri-user-fill" isGrey={isGrey}>
                        <Text as="span">
                            <b>{bundle.ownerCount}</b> {bundle.ownerCount <= 1 ? 'propriétaire' : 'propriétaires'}
                        </Text>
                    </AppCard>
                    {(bundle.campaignNumber ?? 0) > 0 && mainCampaign?.sendingDate &&
                        <AppCard icon="ri-send-plane-fill" isGrey={isGrey}>
                            <Text as="span">
                                envoyée
                                le <b>{format(mainCampaign?.sendingDate!, 'dd/MM/yy', { locale: fr })}</b>
                            </Text>
                        </AppCard>
                    }
                </>
            }
        </>
    )
}

export default CampaignBundleInfos;
