import { RequestHandler } from 'express';

/**
 * Routes requests to different handlers based on environment variable feature flag.
 *
 * @param flagName - Environment variable name to check
 * @param whenEnabled - Handler to use when process.env[flagName] === 'true'
 * @param whenDisabled - Handler to use otherwise (default/fallback)
 * @returns Express middleware that delegates to appropriate handler
 */
export default function featureFlagRouter(
  flagName: string,
  whenEnabled: RequestHandler,
  whenDisabled: RequestHandler
): RequestHandler {
  return (request, response, next) => {
    const isEnabled = process.env[flagName] === 'true';
    const handler = isEnabled ? whenEnabled : whenDisabled;
    return handler(request, response, next);
  };
}
