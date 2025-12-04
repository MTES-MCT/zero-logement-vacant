import { constants } from 'http2';

import { HttpError } from './httpError';

/**
 * Error thrown when a virus is detected in an uploaded file
 */
export default class VirusDetectedError extends HttpError implements HttpError {
  public readonly viruses: string[];
  public readonly filename: string;

  constructor(filename: string, viruses: string[]) {
    const virusList = viruses.join(', ');
    super({
      name: 'VirusDetectedError',
      message: `Virus detected in file "${filename}": ${virusList}`,
      status: constants.HTTP_STATUS_BAD_REQUEST,
      data: {
        filename,
        viruses
      }
    });
    this.viruses = viruses;
    this.filename = filename;
  }
}
