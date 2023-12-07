import config from './config';
import { PushEvents } from '../../../shared';

export function createSession() {
  const source = new EventSource(`${config.apiEndpoint}/api/push`);

  function register<K extends keyof PushEvents>(type: K) {
    return (callback: (data: PushEvents[K]) => void): void => {
      source.addEventListener(type as string, (event) =>
        callback(JSON.parse(event.data))
      );
    };
  }

  return {
    close: () => source.close(),
    onGroupFinalized: register('group:finalized'),
  };
}
