import { number, object, ObjectSchema, string } from 'yup';

export interface SourceBuilding {
  building_id: string;
  housing_vacant_count: number;
  housing_rent_count: number;
}

export const sourceBuildingSchema: ObjectSchema<SourceBuilding> = object({
  building_id: string().required('building_id is required'),
  housing_vacant_count: number()
    .required('housing_vacant_count is required')
    .truncate(),
  housing_rent_count: number()
    .required('housing_rent_count is required')
    .truncate()
});
