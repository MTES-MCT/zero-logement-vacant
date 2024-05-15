/**
 * Avoid naming it FileDTO because File is a global type in JS.
 */
export interface FileUploadDTO {
  id: string;
  type: string;
  url: string;
}
