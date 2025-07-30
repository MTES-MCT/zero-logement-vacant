import { http, HttpResponse, RequestHandler } from 'msw';

export const otherHandlers: RequestHandler[] = [
  http.get(
    'https://app.livestorm.co/p/1b26afab-3332-4b6d-a9e4-3f38b4cc6c43/form',
    async () => {
      return HttpResponse.html();
    }
  )
];
