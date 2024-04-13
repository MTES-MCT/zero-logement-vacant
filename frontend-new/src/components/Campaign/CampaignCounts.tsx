import { useCountHousingQuery } from '../../services/housing.service';
import { displayCount } from '../../utils/stringUtils';

interface CampaignCountsProps {
  campaignId: string;
}

const CampaignCounts = ({ campaignId }: CampaignCountsProps) => {
  const { data: housingCount } = useCountHousingQuery({
    campaignIds: [campaignId],
  });

  return (
    <>
      <span className="fr-icon--sm fr-icon-home-4-fill d-block">
         
        {housingCount
          ? displayCount(housingCount?.housing ?? 0, 'logement')
          : '...'}
      </span>
      <span className="fr-icon--sm fr-icon-user-fill d-block">
         
        {housingCount
          ? displayCount(housingCount?.owners ?? 0, 'propriétaire')
          : '...'}
      </span>
    </>
  );
};

export default CampaignCounts;
