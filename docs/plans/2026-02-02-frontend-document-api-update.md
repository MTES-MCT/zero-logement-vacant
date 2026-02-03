# Frontend Document API Update

**Date:** 2026-02-02

**Goal:** Update frontend to use the new document upload API endpoints that separate document upload from housing association (many-to-many relationship).

**Context:** Backend refactoring ([2026-01-28-document-upload-refactoring.md](./2026-01-28-document-upload-refactoring.md)) introduced new API endpoints that separate document storage from housing associations. Frontend needs to adopt these endpoints while maintaining current UX.

---

## Design Decisions

### 1. Upload Flow Strategy

**Decision:** Two-step flow with automatic linking (Option A)

**Implementation:**
- Step 1: Upload files to `POST /documents` (returns document IDs)
- Step 2: Automatically link returned documents to housing via `POST /housing/:id/documents`
- User experience: Seamless, feels identical to current single-step upload
- Benefit: Enables future document reuse features without UX changes

**Alternatives Considered:**
- Separate "Upload" and "Attach" buttons (rejected: premature complexity)
- Legacy wrapper endpoint (rejected: hides architectural improvement)

### 2. Document Deletion Behavior

**Decision:** Unlink only, keep UI text unchanged (Option A)

**Implementation:**
- "Supprimer" button calls `DELETE /housing/:id/documents/:id` (unlinks)
- Document remains in `documents` table, can be reattached later
- No UI text changes (transparent behavioral change)
- Backend change: old endpoint deleted document, new endpoint unlinks only

**Rationale:**
- Aligns with new many-to-many architecture
- Enables future document reuse scenarios
- Users don't need to understand the distinction

### 3. Batch Document Linking

**Decision:** Skip for initial implementation (Option B)

**Rationale:**
- Keeps scope manageable
- Backend supports `PUT /housing` with `documentIds` field
- Can be added to `HousingListEditionSideMenu` in future iteration

### 4. Service Layer Refactoring

**Decision:** Update existing endpoints in-place (Option A)

**Implementation:**
- Replace internal implementation of existing mutations
- Component code remains unchanged (same hook names)
- Two new primitive mutations exposed: `useUploadDocumentsMutation`, `useLinkDocumentsToHousingMutation`
- Components orchestrate both mutations

**Benefit:**
- Minimal component changes
- Explicit two-step flow at component level
- Maximum flexibility for future features

---

## API Changes

### New Backend Endpoints

```
POST /documents                              # Upload unlinked documents
PUT /documents/:id                           # Rename document (no housing context)
DELETE /documents/:id                        # Delete document permanently
POST /housing/:id/documents                  # Link existing documents (body: { documentIds })
DELETE /housing/:id/documents/:id            # Unlink document (keep in system)
GET /housing/:id/documents                   # List housing documents (unchanged)
```

### Removed Backend Endpoints

```
POST /housing/:id/documents                  # Old: upload + link (replaced)
PUT /housing/:housingId/documents/:documentId # Old: rename with housing context (removed)
```

---

## Implementation Plan

### Part 1: Service Layer (`document.service.ts`)

**New Endpoints:**

```typescript
// Upload documents (unlinked)
uploadDocuments: builder.mutation<
  ReadonlyArray<DocumentDTO | FileValidationError>,
  { files: ReadonlyArray<File> }
>({
  query: ({ files }) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return {
      url: 'documents',
      method: 'POST',
      body: formData
    };
  },
  invalidatesTags: ['Document']
})

// Link documents to housing
linkDocumentsToHousing: builder.mutation<
  ReadonlyArray<HousingDocumentDTO>,
  { housingId: HousingDTO['id']; documentIds: DocumentDTO['id'][] }
>({
  query: ({ housingId, documentIds }) => ({
    url: `housing/${housingId}/documents`,
    method: 'POST',
    body: { documentIds }
  }),
  invalidatesTags: (_result, _error, { housingId }) => [
    { type: 'Document', id: `LIST-${housingId}` }
  ]
})

// Update document (simplified - no housing context)
updateDocument: builder.mutation<
  DocumentDTO,
  { documentId: DocumentDTO['id']; filename: string }
>({
  query: ({ documentId, filename }) => ({
    url: `documents/${documentId}`,
    method: 'PUT',
    body: { filename }
  }),
  async onQueryStarted({ documentId, filename }, { dispatch, queryFulfilled }) {
    // Optimistic update for all housings that have this document
    // Implementation similar to existing pattern
  }
})

// Unlink document from housing
unlinkDocument: builder.mutation<
  void,
  { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] }
>({
  query: ({ housingId, documentId }) => ({
    url: `housing/${housingId}/documents/${documentId}`,
    method: 'DELETE'
  }),
  async onQueryStarted({ housingId, documentId }, { dispatch, queryFulfilled }) {
    // Optimistic update pattern (existing)
  }
})
```

**Exported Hooks:**

```typescript
export const {
  useListHousingDocumentsQuery,
  useUploadDocumentsMutation,           // NEW
  useLinkDocumentsToHousingMutation,    // NEW
  useUpdateDocumentMutation,            // UPDATED
  useUnlinkDocumentMutation             // RENAMED (was useRemoveDocumentMutation)
} = documentApi;
```

### Part 2: Upload Component (`HousingDocumentUpload.tsx`)

**Two-Step Orchestration:**

```typescript
function HousingDocumentUpload(props: Readonly<HousingDocumentUploadProps>) {
  const [uploadDocuments, uploadMutation] = useUploadDocumentsMutation();
  const [linkDocuments, linkMutation] = useLinkDocumentsToHousingMutation();

  // Combined state tracking
  const isLoading = uploadMutation.isLoading || linkMutation.isLoading;
  const isSuccess = uploadMutation.isSuccess && linkMutation.isSuccess;
  const isError = uploadMutation.isError || linkMutation.isError;

  async function onUpload(files: ReadonlyArray<File>) {
    if (!files.length) {
      uploadMutation.reset();
      linkMutation.reset();
      return;
    }

    try {
      // Step 1: Upload documents
      const uploadResult = await uploadDocuments({ files }).unwrap();

      // Extract successful uploads (filter FileValidationErrors)
      const successfulDocuments = uploadResult.filter(
        (item): item is DocumentDTO => !isFileValidationError(item)
      );

      if (successfulDocuments.length === 0) {
        return; // All uploads failed
      }

      // Step 2: Link successful documents to housing
      const documentIds = successfulDocuments.map(doc => doc.id);
      await linkDocuments({
        housingId: props.housing.id,
        documentIds
      }).unwrap();

    } catch (error) {
      console.error('Upload or link failed', error);
    }
  }

  // Error handling for partial success
  const documentsOrErrors = uploadMutation.data ?? [];
  const errors: ReadonlyArray<FileValidationError> =
    uploadMutation.isError &&
    uploadMutation.error &&
    isFetchBaseQueryError(uploadMutation.error) &&
    uploadMutation.error.data &&
    Array.isArray(uploadMutation.error.data) &&
    Array.every(uploadMutation.error.data, isFileValidationError)
      ? uploadMutation.error.data
      : documentsOrErrors.filter(isFileValidationError);

  const error: string | undefined = match(errors.length)
    .returnType<string | undefined>()
    .with(0, () => undefined)
    .with(
      documentsOrErrors.length,
      () => 'Aucun fichier n'a pu être importé...'
    )
    .otherwise(
      () => 'Certains fichiers n'ont pas pu être importés...'
    );

  return (
    <DocumentUpload
      id="housing-document-upload"
      accept={ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS as string[]}
      error={error}
      hint="Taille maximale par fichier : 25Mo..."
      isError={isError}
      isLoading={isLoading}
      isSuccess={isSuccess}
      label="Associez un ou plusieurs documents à ce logement"
      maxSize={25}
      multiple
      onUpload={onUpload}
    />
  );
}
```

### Part 3: Document Management (`DocumentsTab.tsx`)

**Rename Operation (Simplified):**

```typescript
// OLD: updateDocument({ documentId, housingId, filename })
// NEW: updateDocument({ documentId, filename })

function rename(filename: string): void {
  if (!selectedDocument) return;

  updateDocument({
    documentId: selectedDocument.id,
    filename  // No housingId needed
  })
    .unwrap()
    .then(() => {
      setSelectedDocument(null);
      documentRenameModal.close();
    })
    .catch((error) => {
      console.warn('Error renaming document', error);
    });
}
```

**Unlink Operation (Renamed):**

```typescript
// OLD: removeDocument({ documentId, housingId })
// NEW: unlinkDocument({ documentId, housingId })

const [unlinkDocument, unlinkDocumentMutation] = useUnlinkDocumentMutation();

function deleteDocument(): void {
  if (!documentToDelete) return;

  unlinkDocument({
    documentId: documentToDelete.id,
    housingId: housingId  // Still needed for association removal
  })
    .unwrap()
    .then(() => {
      setDocumentToDelete(null);
      documentDeleteModal.close();
    })
    .catch((error) => {
      console.warn('Error unlinking document', error);
    });
}
```

**Note:** UI text remains unchanged ("Supprimer"), behavior changes to unlink-only.

### Part 4: Mock Handlers (`document-handlers.ts`)

**New Handler: Upload Documents**

```typescript
const upload = http.post<
  never,
  FormData,
  DocumentDTO[] | Error
>(
  `${config.apiEndpoint}/api/documents`,
  async ({ request }) => {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return HttpResponse.json(
        { name: 'FilesMissingError', message: 'No files uploaded' },
        { status: constants.HTTP_STATUS_BAD_REQUEST }
      );
    }

    const creator = data.users[0];
    if (!creator) {
      return HttpResponse.json(
        { name: 'Error', message: 'No user available' },
        { status: constants.HTTP_STATUS_INTERNAL_SERVER_ERROR }
      );
    }

    const documents: DocumentDTO[] = files.map((file) => {
      const document: DocumentDTO = {
        id: uuidv4(),
        filename: file.name,
        url: URL.createObjectURL(file),
        contentType: file.type,
        sizeBytes: file.size,
        createdAt: new Date().toJSON(),
        updatedAt: null,
        creator
      };
      data.documents.set(document.id, document);
      return document;
    });

    return HttpResponse.json(documents, {
      status: constants.HTTP_STATUS_CREATED
    });
  }
);
```

**New Handler: Link Documents to Housing**

```typescript
const linkToHousing = http.post<
  { id: HousingDTO['id'] },
  { documentIds: DocumentDTO['id'][] },
  DocumentDTO[] | Error
>(
  `${config.apiEndpoint}/api/housing/:id/documents`,
  async ({ params, request }) => {
    const { documentIds } = await request.json();

    const housing = data.housings.find((h) => h.id === params.id);
    if (!housing) {
      return HttpResponse.json(
        { name: 'HousingMissingError', message: `Housing ${params.id} missing` },
        { status: constants.HTTP_STATUS_NOT_FOUND }
      );
    }

    // Verify all documents exist
    const documents = documentIds
      .map((id) => data.documents.get(id))
      .filter(Predicate.isNotUndefined);

    if (documents.length !== documentIds.length) {
      return HttpResponse.json(
        { name: 'DocumentMissingError', message: 'Some documents not found' },
        { status: constants.HTTP_STATUS_BAD_REQUEST }
      );
    }

    // Link documents to housing
    const existingDocs = data.housingDocuments.get(params.id) ?? [];
    const newRefs = documentIds.map((id) => ({ id }));
    data.housingDocuments.set(params.id, [...existingDocs, ...newRefs]);

    return HttpResponse.json(documents, {
      status: constants.HTTP_STATUS_CREATED
    });
  }
);
```

**Updated Handler: Rename Document**

```typescript
const update = http.put<
  { id: DocumentDTO['id'] },
  DocumentPayload,
  DocumentDTO | Error
>(
  `${config.apiEndpoint}/api/documents/:id`,
  async ({ params, request }) => {
    const document = data.documents.get(params.id);
    if (!document) {
      return HttpResponse.json(
        { name: 'DocumentMissingError', message: `Document ${params.id} missing` },
        { status: constants.HTTP_STATUS_NOT_FOUND }
      );
    }

    const payload = await request.json();
    const updated: DocumentDTO = {
      ...document,
      filename: payload.filename,
      updatedAt: new Date().toJSON()
    };
    data.documents.set(document.id, updated);

    return HttpResponse.json(updated, {
      status: constants.HTTP_STATUS_OK
    });
  }
);
```

**Updated Handler: Unlink Document**

```typescript
const removeByHousing = http.delete<
  { housingId: HousingDTO['id']; documentId: DocumentDTO['id'] },
  never,
  null | Error
>(
  `${config.apiEndpoint}/api/housing/:housingId/documents/:documentId`,
  async ({ params }) => {
    const exists = data.housingDocuments
      .get(params.housingId)
      ?.map((document) => document.id)
      ?.includes(params.documentId);

    if (!exists) {
      return HttpResponse.json(
        {
          name: 'DocumentMissingError',
          message: `Document ${params.documentId} not linked to housing`
        },
        { status: constants.HTTP_STATUS_NOT_FOUND }
      );
    }

    // KEY CHANGE: Only remove from housingDocuments, keep in data.documents
    data.housingDocuments.set(
      params.housingId,
      (data.housingDocuments.get(params.housingId) ?? []).filter(
        (document) => document.id !== params.documentId
      )
    );
    // OLD: data.documents.delete(params.documentId); // REMOVED

    return HttpResponse.json(null, {
      status: constants.HTTP_STATUS_NO_CONTENT
    });
  }
);
```

**Removed Handler:**

```typescript
// REMOVED: updateByHousing (PUT /housing/:housingId/documents/:documentId)
// Replaced by: update (PUT /documents/:id)
```

**Updated Export:**

```typescript
export const documentHandlers: RequestHandler[] = [
  listByHousing,
  upload,           // NEW
  linkToHousing,    // NEW (replaces createByHousing)
  update,           // UPDATED (replaces updateByHousing)
  removeByHousing   // UPDATED (now unlinks only)
];
```

---

## Testing Strategy

### View-Level Tests (`HousingView.test.tsx`)

**Existing tests continue to work:**
- Document upload tests (lines 1283-1303)
- Rename tests (lines 898-974)
- Delete tests (lines 976-1046)
- Visualize tests (lines 1049-1212)
- Download tests (lines 1214-1281)

**Why no changes needed:**
- Tests interact with view-level UI
- Mock handlers abstract API changes
- Test setup uses `data.documents` and `data.housingDocuments` maps
- Component behavior remains the same from user perspective

**Verification Steps:**
1. Update mock handlers
2. Update service layer
3. Update components
4. Run `yarn nx test frontend -- HousingView.test.tsx`
5. All existing tests should pass without modification

---

## Files to Modify

| File | Changes | Lines Changed | Complexity |
|------|---------|---------------|------------|
| `frontend/src/services/document.service.ts` | Replace 4 endpoints | ~80 | Medium |
| `frontend/src/components/FileUpload/HousingDocumentUpload.tsx` | Two-step upload orchestration | ~40 | Medium |
| `frontend/src/components/HousingDetails/DocumentsTab.tsx` | Simplify rename/unlink calls | ~10 | Low |
| `frontend/src/mocks/handlers/document-handlers.ts` | Update 4 handlers | ~100 | Medium |

**Total Estimated Changes:** ~230 lines

---

## Implementation Checklist

### Phase 1: Mock Handlers (Enables Testing)
- [ ] Add `upload` handler for `POST /documents`
- [ ] Add `linkToHousing` handler for `POST /housing/:id/documents` (body: `{ documentIds }`)
- [ ] Update `update` handler to use `PUT /documents/:id` (remove housing context)
- [ ] Update `removeByHousing` handler to unlink only (keep in `data.documents`)
- [ ] Remove `updateByHousing` handler
- [ ] Update `documentHandlers` export

### Phase 2: Service Layer
- [ ] Add `uploadDocuments` mutation
- [ ] Add `linkDocumentsToHousing` mutation
- [ ] Update `updateDocument` mutation (remove `housingId` parameter)
- [ ] Rename `removeDocument` to `unlinkDocument`
- [ ] Update exported hooks

### Phase 3: Components
- [ ] Update `HousingDocumentUpload` to orchestrate upload + link
- [ ] Handle combined loading/error states
- [ ] Handle partial success (some uploads fail)
- [ ] Update `DocumentsTab` rename call (remove `housingId`)
- [ ] Update `DocumentsTab` delete call (use `unlinkDocument` hook)

### Phase 4: Verification
- [ ] Run `yarn nx test frontend -- HousingView.test.ts`
- [ ] Verify all document tests pass
- [ ] Manual testing: upload documents
- [ ] Manual testing: rename document
- [ ] Manual testing: delete (unlink) document
- [ ] Manual testing: verify partial success handling

---

## Breaking Changes

**For End Users:**
- None (UI behavior identical)

**For Developers:**
- Service layer hook names changed
- Hook signatures changed (removed `housingId` from rename)
- Components must orchestrate two-step upload flow

---

## Future Enhancements

**Not in Current Scope:**

1. **Batch Document Linking** (`HousingListEditionSideMenu`)
   - Add document upload/selection to batch edit menu
   - Link documents to multiple selected housings at once
   - Backend already supports via `PUT /housing` with `documentIds` field

2. **Document Reuse UI**
   - "Browse existing documents" button
   - Modal to select previously uploaded documents
   - Link existing documents to current housing

3. **Document Library View**
   - View all documents across establishment
   - Filter/search documents
   - See which housings use each document

---

## Risk Mitigation

**Risk:** Two-step upload fails between upload and link
**Mitigation:**
- Documents uploaded but not linked (orphaned in database)
- User can re-upload (will create duplicate)
- Future: Add cleanup job for orphaned documents

**Risk:** Partial upload success confuses users
**Mitigation:**
- Clear error messages distinguish upload vs link failures
- Successful documents are linked even if some fail
- Error UI shows which files failed and why

**Risk:** Existing tests break
**Mitigation:**
- Mock handlers updated first
- View-level tests unaffected by service layer changes
- Manual testing plan included

---

## Success Criteria

- [ ] All existing view-level tests pass
- [ ] Upload flow works end-to-end (upload → link)
- [ ] Partial success handled gracefully (some files fail)
- [ ] Rename operation works (no `housingId` needed)
- [ ] Delete operation unlinks only (document remains in system)
- [ ] No console errors or warnings
- [ ] No breaking changes for end users

---

## Notes

- Backend API already implemented and tested
- Frontend changes are isolated to document workflow
- No database migrations needed (frontend-only)
- Architecture enables future document reuse features
