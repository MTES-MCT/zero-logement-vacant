import { SettingsDTO } from '@zerologementvacant/models';

export interface SettingsApi {
  id: string;
  establishmentId: string;
  contactPoints: {
    public: boolean;
  };
  inbox: {
    enabled: boolean;
  };
}

export function toDBO(settings: SettingsApi): SettingsDTO {
  return {
    contactPoints: settings.contactPoints,
    inbox: settings.inbox
  };
}
