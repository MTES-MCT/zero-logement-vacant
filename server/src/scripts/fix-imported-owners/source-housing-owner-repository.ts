import {
  createGenericSourceRepository,
  type SourceRepositoryOptions
} from '~/scripts/fix-imported-owners/generic-source-repository';
import { SourceHousingOwner } from '~/scripts/fix-imported-owners/source-housing-owner';
import type { SourceRepository } from '~/scripts/import-lovac/infra/source-repository';

export function createSourceHousingOwnerRepository(
  options: SourceRepositoryOptions
): SourceRepository<SourceHousingOwner> {
  return createGenericSourceRepository<SourceHousingOwner>(options);
}
