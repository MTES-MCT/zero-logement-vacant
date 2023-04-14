import { Option } from './option';

export interface AttioOption {
  id: {
    workspace_id: string;
    object_id: string;
    attribute_id: string;
    option_id: string;
  };
  title: string;
  is_archived: boolean;
}

export function toOption(option: AttioOption): Option {
  return {
    id: option.id.option_id,
    title: option.title,
    is_archived: option.is_archived,
  };
}
