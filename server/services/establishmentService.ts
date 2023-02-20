import { EstablishmentApi } from '../models/EstablishmentApi';
import establishmentRepository from '../repositories/establishmentRepository';
import campaignRepository from '../repositories/campaignRepository';
import { DefaultCampaign } from '../models/CampaignApi';

const makeEstablishmentAvailable = async (
  establishment: EstablishmentApi
): Promise<void> => {
  await establishmentRepository.update({ ...establishment, available: true });
  await createDefaultCampaign(establishment.id);
};

const createDefaultCampaign = async (
  establishmentId: string
): Promise<void> => {
  await campaignRepository
    .getCampaignBundle(establishmentId, '0')
    .then((campaignBundle) => {
      if (!campaignBundle) {
        campaignRepository.insert(<any>{
          ...DefaultCampaign,
          establishmentId,
        });
      }
    });
};

export default {
  makeEstablishmentAvailable,
};
