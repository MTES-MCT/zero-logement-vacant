import { SettingsDTO } from '@zerologementvacant/models';

export interface SettingsApi {
  id: string;
  establishmentId: string;
  inbox: {
    enabled: boolean;
  };
}

export function toDBO(settings: SettingsApi): SettingsDTO {
  return {
    inbox: settings.inbox
  };
}
