import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useFindEventsByHousingQuery } from '../services/event.service';
import { useFindNotesByHousingQuery } from '../services/note.service';
import { useFindOwnersByHousingQuery } from '../services/owner.service';
import _ from 'lodash';
import { useCampaignList } from './useCampaignList';
import {
  useCountHousingQuery,
  useGetHousingQuery,
} from '../services/housing.service';
import { campaignSort } from '../models/Campaign';
import { isDefined } from '../utils/compareUtils';

export function useHousing() {
  const { housingId } = useParams<{ housingId: string }>();

  const { data: housing } = useGetHousingQuery(housingId);

  const { data: events, refetch: refetchHousingEvents } =
    useFindEventsByHousingQuery(housingId);

  const { data: notes, refetch: refetchHousingNotes } =
    useFindNotesByHousingQuery(housingId);

  const { data: housingOwners } = useFindOwnersByHousingQuery(housingId);

  const campaignList = useCampaignList();

  const mainHousingOwner = housingOwners?.find((_) => _.rank === 1);
  const coOwners = housingOwners?.filter((_) => _.rank !== 1);

  const { data: count } = useCountHousingQuery(
    {
      ownerIds: [mainHousingOwner?.id ?? ''],
    },
    { skip: !mainHousingOwner }
  );

  const campaigns = useMemo(
    () =>
      _.uniq(
        housing?.campaignIds
          .map((campaignId) => campaignList?.find((c) => c.id === campaignId))
          .filter(isDefined)
          .sort(campaignSort)
      ),
    [housing, campaignList]
  );

  return {
    events,
    notes,
    refetchHousingEvents,
    refetchHousingNotes,
    mainHousingOwner,
    coOwners,
    housingOwners,
    housing,
    count,
    campaigns,
  };
}
