import { Settings } from '../../shared/models/Settings';

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

export function toDBO(settings: SettingsApi): Settings {
  return {
    contactPoints: settings.contactPoints,
    inbox: settings.inbox,
  };
}
