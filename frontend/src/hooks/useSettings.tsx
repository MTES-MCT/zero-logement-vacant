import { useEffect } from 'react';

import {
  fetchSettings as doFetchSettings,
  updateSettings,
} from '../store/actions/settingsAction';
import { useAppDispatch, useAppSelector } from './useStore';

export function useSettings() {
  const dispatch = useAppDispatch();
  const { settings: state } = useAppSelector((state) => state);

  function togglePublishContactPoints() {
    if (state.settings) {
      dispatch(
        updateSettings({
          contactPoints: {
            public: !state.settings.contactPoints.public,
          },
        })
      );
    }
  }

  useEffect(() => {
    dispatch(doFetchSettings());
  }, [dispatch]);

  return {
    settings: state.settings,
    togglePublishContactPoints,
  };
}
