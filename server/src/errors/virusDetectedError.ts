import { constants } from 'http2';

/**
 * Error thrown when a virus is detected in an uploaded file
 */
class VirusDetectedError extends Error {
  public readonly status: number;
  public readonly viruses: string[];
  public readonly filename: string;

  constructor(filename: string, viruses: string[]) {
    const virusList = viruses.join(', ');
    super(`Virus detected in file "${filename}": ${virusList}`);
    this.name = 'VirusDetectedError';
    this.status = constants.HTTP_STATUS_BAD_REQUEST;
    this.viruses = viruses;
    this.filename = filename;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VirusDetectedError);
    }
  }
}

export default VirusDetectedError;
