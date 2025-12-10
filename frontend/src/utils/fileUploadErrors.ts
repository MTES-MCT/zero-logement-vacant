/**
 * File upload error reasons returned by the server
 */
export type FileUploadErrorReason =
  | 'virus_detected'
  | 'file_too_large'
  | 'invalid_file_type'
  | 'mime_mismatch'
  | 'service_unavailable'
  | 'scan_error'
  | 'unexpected_field'
  | 'too_many_files'
  | 'upload_error'
  | 'unknown';

/**
 * Error response structure from file upload API
 */
export interface FileUploadErrorResponse {
  error: string;
  reason: FileUploadErrorReason;
  message: string;
  details?: {
    filename?: string;
    viruses?: string[];
    maxSize?: number;
    allowedTypes?: string[];
    service?: string;
  };
}

/**
 * User-friendly error messages for file upload failures
 * These messages are displayed to the user in French
 */
export const FILE_UPLOAD_ERROR_MESSAGES: Record<FileUploadErrorReason, string> = {
  virus_detected: 'Fichier rejeté pour raison de sécurité. Le fichier contient un contenu malveillant.',
  file_too_large: 'Fichier trop volumineux (maximum 5 Mo)',
  invalid_file_type: 'Type de fichier non autorisé. Formats acceptés : PNG, JPEG, PDF',
  mime_mismatch: 'Le contenu du fichier ne correspond pas à son extension. Vérifiez que le fichier n\'a pas été renommé.',
  service_unavailable: 'Service temporairement indisponible. Veuillez réessayer ultérieurement.',
  scan_error: 'Erreur lors de l\'analyse du fichier. Veuillez réessayer.',
  unexpected_field: 'Champ de fichier inattendu. Veuillez vérifier le formulaire.',
  too_many_files: 'Trop de fichiers. Un seul fichier est autorisé.',
  upload_error: 'Erreur lors de l\'envoi du fichier. Veuillez réessayer.',
  unknown: 'Une erreur est survenue lors de l\'envoi du fichier'
};

/**
 * Geo perimeter upload error messages (for shapefile uploads)
 */
export const GEO_UPLOAD_ERROR_MESSAGES: Record<FileUploadErrorReason | 'missing_components' | 'too_many_features', string> = {
  virus_detected: 'Fichier rejeté pour raison de sécurité. L\'archive contient un contenu malveillant.',
  file_too_large: 'Fichier trop volumineux (maximum 100 Mo)',
  invalid_file_type: 'Type de fichier non autorisé. Veuillez uploader une archive ZIP contenant un shapefile.',
  mime_mismatch: 'Le fichier n\'est pas une archive ZIP valide.',
  missing_components: 'Le fichier importé est invalide. Le fichier .zip à importer doit contenir au minimum un fichier .shp et un fichier .dbf.',
  too_many_features: 'Le shapefile contient trop d\'éléments (maximum 10 000 features).',
  service_unavailable: 'Service temporairement indisponible. Veuillez réessayer ultérieurement.',
  scan_error: 'Erreur lors de l\'analyse du fichier. Veuillez réessayer.',
  unexpected_field: 'Champ de fichier inattendu. Veuillez vérifier que vous uploadez bien un fichier ZIP.',
  too_many_files: 'Trop de fichiers. Un seul fichier ZIP est autorisé.',
  upload_error: 'Erreur lors de l\'envoi du fichier. Veuillez réessayer.',
  unknown: 'Une erreur est survenue lors de l\'envoi du fichier'
};

/**
 * Get max file size limit from environment variable
 * @param isGeoUpload - Whether this is a geo perimeter upload
 * @returns Max file size in MB
 */
function getMaxFileSize(isGeoUpload: boolean): number {
  if (isGeoUpload) {
    return parseInt(import.meta.env.VITE_GEO_UPLOAD_MAX_SIZE_MB || '100', 10);
  }
  return parseInt(import.meta.env.VITE_FILE_UPLOAD_MAX_SIZE_MB || '5', 10);
}

/**
 * Parse error response and return user-friendly message
 * @param error - Error object from RTK Query or fetch
 * @param isGeoUpload - Whether this is a geo perimeter upload (uses different messages)
 * @returns User-friendly error message in French
 */
export function getFileUploadErrorMessage(error: unknown, isGeoUpload = false): string {
  const messages = isGeoUpload ? GEO_UPLOAD_ERROR_MESSAGES : FILE_UPLOAD_ERROR_MESSAGES;

  // Handle RTK Query error structure
  if (error && typeof error === 'object' && 'data' in error) {
    const errorData = (error as { data: unknown }).data;

    if (errorData && typeof errorData === 'object' && 'reason' in errorData) {
      const response = errorData as FileUploadErrorResponse;
      const reason = response.reason || 'unknown';

      // Handle file_too_large with dynamic size
      if (reason === 'file_too_large') {
        const maxSize = getMaxFileSize(isGeoUpload);
        return `Fichier trop volumineux (maximum ${maxSize} Mo)`;
      }

      // Check for specific error patterns in message (geo uploads only)
      if (isGeoUpload) {
        const geoMessages = messages as typeof GEO_UPLOAD_ERROR_MESSAGES;
        if (response.message?.includes('Missing')) {
          return geoMessages.missing_components;
        }
        if (response.message?.includes('too many features')) {
          return geoMessages.too_many_features;
        }
      }

      return messages[reason] || messages.unknown;
    }
  }

  // Handle HTTP status codes
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;

    if (status === 413) {
      // Dynamic message based on upload type
      const maxSize = getMaxFileSize(isGeoUpload);
      return `Fichier trop volumineux (maximum ${maxSize} Mo)`;
    }
    if (status === 415) {
      return messages.invalid_file_type;
    }
    if (status === 503) {
      return messages.service_unavailable;
    }
  }

  // Default error message
  return messages.unknown;
}

/**
 * Check if error is a file upload error with structured response
 * @param error - Error to check
 * @returns True if error has FileUploadErrorResponse structure
 */
export function isFileUploadError(error: unknown): error is { data: FileUploadErrorResponse } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'data' in error &&
    typeof (error as { data: unknown }).data === 'object' &&
    (error as { data: unknown }).data !== null &&
    'reason' in (error as { data: object }).data
  );
}
