import { v5 as uuidv5 } from 'uuid';

/**
 * Fixed namespace for deterministic UUID v5 generation across all LOVAC entities.
 * Using the DNS namespace as a stable, well-known UUID.
 */
export const LOVAC_NAMESPACE = uuidv5.DNS;
