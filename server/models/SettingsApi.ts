import { SettingsDTO } from '../../shared/models/SettingsDTO';

export interface SettingsApi {
  id: string;
  establishmentId: string;
  contactPoints: {
    public: boolean;
  };
}

export function toDTO(settings: SettingsApi): SettingsDTO {
  return {
    contactPoints: settings.contactPoints,
  };
}
