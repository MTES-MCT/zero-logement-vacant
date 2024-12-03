import { useEvent } from 'react-use';

import { useAppDispatch, useAppSelector } from './useStore';
import appSlice from '../store/reducers/appReducer';

export function useIsDsfrReady() {
  const dispatch = useAppDispatch();
  const app = useAppSelector((state) => state.app);

  function onLoad() {
    dispatch(appSlice.actions.setDsfrReady());
  }

  useEvent('load', onLoad, window);

  return app.isDsfrReady;
}
