import { EstablishmentApi } from '../models/EstablishmentApi';
import establishmentRepository from '../repositories/establishmentRepository';

const makeEstablishmentAvailable = async (
  establishment: EstablishmentApi
): Promise<void> => {
  await establishmentRepository.update({ ...establishment, available: true });
};

export default {
  makeEstablishmentAvailable,
};
