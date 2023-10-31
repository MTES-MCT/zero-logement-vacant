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

  async function togglePublishContactPoints() {
    if (settings && establishmentId) {
      await upsertSettings({
        establishmentId,
        settings: {
          contactPoints: {
            public: !settings.contactPoints.public,
          },
        },
      });
    }
  }

  return {
    settings,
    togglePublishContactPoints,
  };
}
