# Document Upload Architecture

## Overview

The document upload system supports uploading documents once and linking them to multiple entities (housings, campaigns, etc.) with a many-to-many relationship architecture.

**Key Features:**
- Upload documents independently via `POST /documents`
- Link documents to multiple entities after upload
- Partial success handling (some uploads can fail while others succeed)
- Reusable across different domains (housings, campaigns, etc.)
- Batch operations for linking documents to multiple entities at once

## Architecture

### Database Schema

**Three-table design:**

1. **`documents`** - Stores document metadata and S3 references
   - `id` (uuid, PK)
   - `filename` (text)
   - `s3_key` (text) - S3 object key
   - `content_type` (text)
   - `size_bytes` (integer)
   - `establishment_id` (uuid, NOT NULL, FK to establishments)
   - `created_by` (uuid, FK to users)
   - `created_at`, `updated_at`, `deleted_at` (timestamps)

2. **`documents_housings`** - Junction table for document-housing associations
   - `document_id` (uuid, FK to documents)
   - `housing_geo_code` (text)
   - `housing_id` (text)
   - Composite PK: `(document_id, housing_geo_code, housing_id)`
   - ON DELETE CASCADE when document is deleted

3. **Future:** `documents_campaigns` - Same pattern for campaigns

**Key Design Decisions:**
- Documents are establishment-scoped (RLS enforcement point)
- Soft delete on documents (`deleted_at` timestamp)
- Associations use ON DELETE CASCADE for automatic cleanup
- Idempotent linking (INSERT ... ON CONFLICT IGNORE)

### Code Structure

```
server/src/
├── services/
│   └── document-upload.ts             # Validation & S3 upload
├── repositories/
│   ├── documentRepository.ts          # CRUD for documents table
│   └── housingDocumentRepository.ts   # Junction table operations + housing-specific queries
│                                      # (merged documentHousingRepository functionality)
├── controllers/
│   └── documentController.ts          # API endpoint handlers
└── models/
    └── DocumentApi.ts                 # Backend document model

packages/models/src/
└── Document.ts                        # Shared DTO (DocumentDTO)

packages/schemas/src/
└── document-payload.ts                # Validation schemas
```

**Note:** The `housingDocumentRepository` consolidates both junction table operations (`link`, `linkMany`, `unlink`) and housing-specific document queries (`findByHousing`, `get`, `update`, `remove`). The planned separate `documentHousingRepository` was merged into this file during implementation.

## API Endpoints

### 1. Upload Documents (Unlinked)

**POST /api/documents**

Upload one or more documents without linking them to any entity.

```typescript
// Request (multipart/form-data)
files: File[]  // Field name: "files"

// Response
// 201 Created - All succeeded
// 207 Multi-Status - Some succeeded, some failed
// 400 Bad Request - All failed
DocumentDTO[] | (DocumentDTO | FileValidationError)[]

interface DocumentDTO {
  id: string;
  filename: string;
  url: string;              // Pre-signed S3 URL (15min expiry)
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string | null;
  creator: UserDTO;
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@document1.pdf" \
  -F "files=@document2.pdf"
```

**Partial Success Response (207):**
```json
[
  {
    "id": "doc-123",
    "filename": "document1.pdf",
    "url": "https://s3.../presigned-url",
    "contentType": "application/pdf",
    "sizeBytes": 50000,
    "createdAt": "2026-01-28T10:00:00.000Z",
    "updatedAt": null,
    "creator": { "id": "user-1", "email": "user@example.com" }
  },
  {
    "name": "FileValidationError",
    "data": {
      "filename": "document2.exe",
      "reason": "invalid_file_type"
    }
  }
]
```

### 2. Update Document

**PUT /api/documents/:id**

Update document filename (metadata only, not file contents).

```typescript
// Request body
{
  filename: string;  // New filename
}

// Response (200 OK)
DocumentDTO
```

**Example:**
```bash
curl -X PUT http://localhost:3001/api/documents/doc-123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "renamed-document.pdf"}'
```

### 3. Delete Document

**DELETE /api/documents/:id**

Soft-delete document (sets `deleted_at`). Cascade removes all associations automatically.

```typescript
// Response: 204 No Content
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/documents/doc-123 \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Link Documents to Housing

**POST /api/housing/:id/documents**

Link existing documents to a housing. Idempotent (duplicate links are ignored).

```typescript
// Request body
{
  documentIds: string[];  // Array of document IDs to link
}

// Response (201 Created)
DocumentHousingLink[]

interface DocumentHousingLink {
  documentId: string;
  housingId: string;
  housingGeoCode: string;
}
```

**Validation:**
- Housing must exist and belong to user's establishment
- Documents must exist, not be deleted, and belong to user's establishment

**Example:**
```bash
curl -X POST http://localhost:3001/api/housing/house-456/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"documentIds": ["doc-123", "doc-789"]}'
```

### 5. Unlink Document from Housing

**DELETE /api/housing/:housingId/documents/:documentId**

Remove document-housing association only. Document remains in database and can be linked to other entities.

```typescript
// Response: 204 No Content
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/housing/house-456/documents/doc-123 \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Batch Link Documents

**PUT /api/housing**

Link documents to multiple housings in a single request. Creates cartesian product: `documentIds × housings`.

```typescript
// Request body
{
  filters: HousingFiltersApi;  // Select housings
  documentIds?: string[];       // Documents to link
  status?: HousingStatus;       // Can combine with other updates
  note?: string;
  // ... other housing update fields
}

// Response (200 OK)
HousingDTO[]
```

**Example:**
```bash
curl -X PUT http://localhost:3001/api/housing \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "establishmentIds": ["est-1"],
      "housingIds": ["house-1", "house-2", "house-3"]
    },
    "documentIds": ["doc-123", "doc-456"],
    "status": 3
  }'
```

This creates 6 links: 2 documents × 3 housings.

### 7. List Housing Documents

**GET /api/housing/:id/documents**

List all documents linked to a housing (existing endpoint, unchanged).

```typescript
// Response (200 OK)
HousingDocumentDTO[]
```

## Workflow Examples

### Complete Workflow: Upload and Link

```typescript
// 1. Upload documents
const uploadResponse = await fetch('/api/documents', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData  // Contains File objects
});

const documents = await uploadResponse.json();
const successfulDocs = documents.filter(d => !d.name);  // Filter out errors

// 2. Link to housing
await fetch(`/api/housing/${housingId}/documents`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    documentIds: successfulDocs.map(d => d.id)
  })
});
```

### Batch Link to Multiple Housings

```typescript
// Upload documents once
const docs = await uploadDocuments(files);

// Link to 50 housings in one request
await fetch('/api/housing', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filters: {
      establishmentIds: [establishmentId],
      housingIds: housingIds  // Array of 50 IDs
    },
    documentIds: docs.map(d => d.id)
  })
});
```

### Reuse Document Across Multiple Entities

```typescript
const docId = 'doc-123';

// Link to housing A
await linkToHousing(housingA.id, [docId]);

// Link same document to housing B
await linkToHousing(housingB.id, [docId]);

// Future: Link to campaign
await linkToCampaign(campaignId, [docId]);
```

## Implementation Details

### Service Layer

**`server/src/services/document-upload.ts`**

```typescript
// Validates file (type, size, virus scan)
export async function validate(
  file: Express.Multer.File,
  options?: { accept?: string[]; maxSize?: number }
): Promise<void>

// Uploads file to S3
export async function upload(
  file: Express.Multer.File,
  options: { key: string }
): Promise<void>
```

**Usage in controller:**
```typescript
for (const file of files) {
  // Validate
  await validate(file, {
    accept: ['.pdf', '.jpg', '.png'],
    maxSize: 10 * 1024 * 1024  // 10 MB
  });

  // Upload to S3
  const s3Key = generateS3Key(establishment.id, file);
  await upload(file, { key: s3Key });

  // Save metadata to database
  const document = createDocumentApi(file, s3Key, user);
  await documentRepository.insert(document);
}
```

### Repository Layer

**`documentRepository`** (documents table):
```typescript
findOne(id, options?): Promise<DocumentApi | null>
findMany(ids, options?): Promise<DocumentApi[]>
insert(document): Promise<void>
insertMany(documents): Promise<void>
update(document): Promise<void>
remove(id): Promise<void>  // Soft delete
```

**`housingDocumentRepository`** (consolidated: junction table + housing queries):
```typescript
// Junction table operations
link(document: HousingDocumentApi): Promise<void>
linkMany(params: {
  documentIds: string[];
  housingIds: string[];
  housingGeoCodes: string[];
}): Promise<void>
unlink(link: {
  documentId: string;
  housingId: string;
  housingGeoCode: string;
}): Promise<void>
findLinksByDocument(documentId): Promise<DocumentHousingLink[]>
findLinksByHousing(housing: HousingId): Promise<DocumentHousingLink[]>

// Housing-specific document queries (with joins)
findByHousing(housing: HousingId, options?): Promise<HousingDocumentApi[]>
get(id: string, options?): Promise<HousingDocumentApi | null>
update(document: HousingDocumentApi): Promise<void>
remove(document: HousingDocumentApi): Promise<void>  // Soft delete
```

**Key Features:**
- `link()` and `linkMany()` are idempotent (use `ON CONFLICT IGNORE`)
- `linkMany()` creates cartesian product: documents × housings
- Filtering by establishment in all queries (security)
- Supports soft-delete filtering (`deleted: false`)
- `findByHousing()` returns full document data with creator info (joins documents + users tables)

### S3 Key Generation

**Pattern:** `documents/{establishmentId}/{year}/{month}/{day}/{uuid}`

**Example:** `documents/est-123/2026/01/28/doc-456`

**Benefits:**
- Easy to organize by date
- Easy to identify establishment ownership
- Unique per document (UUID)
- Can implement lifecycle policies by prefix (e.g., archive old files)

### Security

**Row-Level Security:**
- All queries filter by `establishment_id`
- Users can only access documents in their establishment
- Enforced at repository layer

**File Validation:**
- File type detection from magic bytes (not extension)
- MIME type verification
- Virus scanning (ClamAV if enabled)
- Size limits enforced

**S3 URLs:**
- Pre-signed URLs with 15-minute expiry
- Generated on-demand per request
- No permanent public access

## Migration Strategy

**Expand-and-Contract Pattern:**

1. **Expand Phase** (Completed):
   - Add `establishment_id` column to `documents` (nullable)
   - Backfill from `users.establishment_id`
   - Make column NOT NULL
   - Add index

2. **Deploy Phase** (Completed):
   - Deploy new code that uses `establishment_id`
   - New documents created with `establishment_id`

3. **Contract Phase** (Not needed):
   - Already completed in expand phase

**Migration File:**
`server/src/infra/database/migrations/20260128204657_documents-add-establishment_id.ts`

## Testing

### Test File Locations

```
server/src/
├── controllers/test/
│   ├── document-api.test.ts                        # POST/PUT/DELETE /documents
│   ├── housing-documents-link-api.test.ts          # POST/DELETE /housing/:id/documents
│   └── housing-batch-update-documents-api.test.ts  # PUT /housing (documentIds)
├── repositories/test/
│   ├── documentRepository.test.ts                  # documents table CRUD
│   └── housingDocumentRepository.test.ts           # All operations: create/link/find/update/remove
└── models/test/
    └── DocumentApi.test.ts
```

**Note:** `housingDocumentRepository.test.ts` consolidates tests for both housing-specific queries (`findByHousing`, `get`, `update`, `remove`) and junction table operations (`link`, `linkMany`, `unlink`, `findLinksByDocument`, `findLinksByHousing`). Legacy `create` and `createMany` methods were removed during refactoring - documents are now created via `documentRepository`, then linked via `link`/`linkMany`.

### Test Fixtures

**Backend:**
```typescript
import { genDocumentApi } from '~/models/DocumentApi';

const document = genDocumentApi({
  filename: 'test.pdf',
  establishmentId: 'est-123',
  createdBy: user.id,
  creator: user
});
```

**Frontend:**
```typescript
import { genDocument } from '~/test/fixtures/document';

const document = genDocument({
  filename: 'test.pdf'
});
```

### Test Sample File

**Location:** `server/src/test/sample.pdf`

**Usage:**
```typescript
import path from 'node:path';

const samplePdfPath = path.join(__dirname, '../../test/sample.pdf');

await request(url)
  .post('/api/documents')
  .use(tokenProvider(user))
  .attach('files', samplePdfPath);
```

## Performance Considerations

### Batch Operations

**Prefer batch endpoints for multiple entities:**

```typescript
// ❌ Bad: N requests
for (const housingId of housingIds) {
  await linkToHousing(housingId, documentIds);
}

// ✅ Good: 1 request
await batchUpdateHousings({
  filters: { housingIds },
  documentIds
});
```

### Pagination

For large result sets, add pagination to `GET /housing/:id/documents`:

```typescript
// Future enhancement
GET /housing/:id/documents?page=1&limit=50
```

### Pre-signed URL Caching

Pre-signed URLs are generated per-request. Consider caching if performance becomes an issue:

```typescript
// Current: Generate per request
const url = await generatePresignedUrl(s3, bucket, key);

// Future: Cache for 10 minutes
const url = await getCachedPresignedUrl(s3, bucket, key);
```

## Extending to Other Domains

### Adding Campaign Documents

**1. Create junction table:**
```sql
CREATE TABLE documents_campaigns (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, campaign_id)
);
```

**2. Create repository:**
```typescript
// server/src/repositories/documentCampaignRepository.ts
export default {
  link(link: DocumentCampaignLink): Promise<void>
  linkMany(params): Promise<void>
  unlink(link: DocumentCampaignLink): Promise<void>
  findByDocument(documentId): Promise<DocumentCampaignLink[]>
  findByCampaign(campaignId): Promise<DocumentCampaignLink[]>
};
```

**3. Add API endpoints:**
```typescript
POST /api/campaigns/:id/documents    // Link documents
DELETE /api/campaigns/:id/documents/:documentId  // Unlink
GET /api/campaigns/:id/documents     // List
```

**Same pattern for any entity!**

## Troubleshooting

### Document Upload Fails with 400

**Cause:** File type not allowed or file too large

**Solution:** Check `ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS` and `MAX_HOUSING_DOCUMENT_SIZE_IN_MiB` in config

### Pre-signed URL Expired

**Cause:** URLs expire after 15 minutes

**Solution:** Refresh the document list to get new URLs

### Document Not Found (404)

**Possible causes:**
1. Document belongs to different establishment
2. Document soft-deleted (`deleted_at IS NOT NULL`)
3. Document ID invalid

**Debug:**
```sql
SELECT * FROM documents WHERE id = 'doc-123';
-- Check establishment_id and deleted_at
```

### Duplicate Key Error on Link

**This should never happen** - linking is idempotent with `ON CONFLICT IGNORE`

**If it occurs:** Check that the composite PK is properly defined in migration

## References

- **Implementation Plan:** `docs/plans/2026-01-28-document-upload-refactoring.md`
- **Migration File:** `server/src/infra/database/migrations/20260128204657_documents-add-establishment_id.ts`
- **S3 Configuration:** `server/src/infra/file-upload/s3.ts`
- **File Validation:** `server/src/services/file-validation.ts`
