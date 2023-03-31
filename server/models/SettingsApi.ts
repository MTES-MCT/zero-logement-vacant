import { Settings } from '../../shared/models/Settings';

export interface SettingsApi {
  id: string;
  establishmentId: string;
  contactPoints: {
    public: boolean;
  };
}

export function toDBO(settings: SettingsApi): Settings {
  return {
    contactPoints: settings.contactPoints,
  };
}
