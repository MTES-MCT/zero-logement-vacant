import { useParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { getHousing } from '../store/actions/housingAction';
import { useAppDispatch, useAppSelector } from './useStore';
import { useFindEventsByHousingQuery } from '../services/event.service';
import { useFindNotesByHousingQuery } from '../services/note.service';
import { useFindOwnersByHousingQuery } from '../services/owner.service';
import _ from 'lodash';
import { CampaignNumberSort } from '../models/Campaign';
import { useCampaignList } from './useCampaignList';

export function useHousing() {
  const dispatch = useAppDispatch();
  const { housingId } = useParams<{ housingId: string }>();

  const { data: events, refetch: refetchHousingEvents } =
    useFindEventsByHousingQuery(housingId);

  const { data: notes, refetch: refetchHousingNotes } =
    useFindNotesByHousingQuery(housingId);

  const { data: housingOwners } = useFindOwnersByHousingQuery(housingId);

  const campaignList = useCampaignList();

  useEffect(() => {
    dispatch(getHousing(housingId));
  }, [housingId, dispatch]);

  const { housing } = useAppSelector((state) => state.housing);

  const mainHousingOwner = housingOwners?.find((_) => _.rank === 1);
  const coOwners = housingOwners?.filter((_) => _.rank !== 1);

  const campaigns = useMemo(
    () =>
      _.uniq(
        housing?.campaignIds
          .map((campaignId) => campaignList?.find((c) => c.id === campaignId))
          .filter((_) => !!_)
          .sort(CampaignNumberSort)
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
    campaigns,
  };
}
