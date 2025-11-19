import {
  useFindSettingsQuery,
  useUpsertSettingsMutation,
} from '../services/settings.service';

export function useSettings(establishmentId?: string) {
  const { data: settings } = useFindSettingsQuery(
    { establishmentId: establishmentId! },
    { skip: !establishmentId }
  );

  const [upsertSettings] = useUpsertSettingsMutation();

  return {
    settings,
    upsertSettings,
  };
}
