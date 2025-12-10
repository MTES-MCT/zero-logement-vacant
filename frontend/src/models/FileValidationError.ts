import { Predicate } from 'effect';

export interface FileValidationError {
  name: 'FileValidationError';
  message: string;
  filename: string;
  reason:
    | 'invalid_file_type'
    | 'mime_mismatch'
    | 'virus_detected'
    | 'file_too_large';
  details?: Record<string, any>;
}

export function isFileValidationError(
  error: unknown
): error is FileValidationError {
  return (
    Predicate.hasProperty(error, 'name') && error.name === 'FileValidationError'
  );
}
