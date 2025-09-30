/**
 * Address normalization according to FANTOIR reference
 * Section 2.5 "Nature de la voie" (Street type)
 */

// FANTOIR abbreviations mapping to full forms
export const FANTOIR_ABBREVIATIONS: Record<string, string[]> = {
  // Most common abbreviations mentioned
  'avenue': ['av', 'ave'],
  'boulevard': ['bd', 'boul', 'blvd'],
  'place': ['pl'],
  'passage': ['pass', 'psg'],
  
  // Other common FANTOIR abbreviations
  'rue': ['r'],
  'route': ['rte', 'rt'],
  'chemin': ['ch', 'che', 'chem'],
  'impasse': ['imp'],
  'allée': ['all', 'allee'],
  'square': ['sq'],
  'cours': ['crs'],
  'quai': ['q'],
  'faubourg': ['fbg', 'fg'],
  'esplanade': ['esp'],
  'promenade': ['prom'],
  'villa': ['v'],
  'cité': ['cite'],
  'lotissement': ['lot'],
  'résidence': ['res', 'residence'],
  'hameau': ['ham'],
  'lieu-dit': ['ld'],
  'pont': ['pt'],
  'carrefour': ['car', 'crf'],
  'rond-point': ['rpt', 'rdpt'],
  'sentier': ['sen'],
  'venelle': ['ven'],
  'ruelle': ['rle'],
  'traverse': ['trav', 'tra'],
  'voie': ['v'],
  'zone': ['z'],
  'domaine': ['dom'],
  'parc': ['prc'],
  'jardin': ['jard', 'jar'],
  'côte': ['cote'],
  'montée': ['mte', 'montee'],
  'descente': ['desc'],
  'corniche': ['cor'],
  'terrasse': ['ter'],
  'plateau': ['plat'],
  'vallon': ['val'],
  'côteau': ['cot', 'coteau'],
  'colline': ['coll'],
  'butte': ['but'],
  'mail': ['mail'],
  'galerie': ['gal'],
  'arcade': ['arc'],
  'porche': ['por'],
  'parvis': ['parv'],
  'placette': ['pla'],
  'carré': ['car', 'carre'],
  'cour': ['c'],
  'enclos': ['enc'],
  'enceinte': ['ent'],
  'giratoire': ['gir'],
  'bretelle': ['bre'],
  'rocade': ['roc'],
  'périphérique': ['per', 'peripherique'],
  'autoroute': ['a', 'aut'],
  'nationale': ['n', 'nat'],
  'départementale': ['d', 'dep'],
  'communale': ['c', 'com'],
  'forestière': ['for', 'forestiere'],
  'rurale': ['rur'],
  'vicinale': ['vic'],
  'privée': ['priv', 'privee'],
  'publique': ['pub']
};

/**
 * Reverse the mapping to create an abbreviation -> full form dictionary
 */
export const ABBREVIATION_TO_FULL = Object.entries(FANTOIR_ABBREVIATIONS)
  .reduce((acc, [full, abbreviations]) => {
    abbreviations.forEach(abbrev => {
      acc[abbrev.toLowerCase()] = full.toLowerCase();
    });
    return acc;
  }, {} as Record<string, string>);

/**
 * Normalizes an address query by replacing abbreviations with full forms
 * and vice-versa for more flexible search
 */
export function normalizeAddressQuery(query: string): string[] {
  if (!query || query.length < 2) return [query];

  const normalized = query.toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .replace(/[^\w\s\-']/g, ' ') // Remove punctuation except dashes and apostrophes
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  const words = normalized.split(' ');
  const variations = new Set<string>([normalized]);

  // For each word, try to replace it with its abbreviations or full form
  words.forEach((word, index) => {
    const wordLower = word.toLowerCase();
    
    // If it's an abbreviation, add the full form
    if (ABBREVIATION_TO_FULL[wordLower]) {
      const fullForm = ABBREVIATION_TO_FULL[wordLower];
      const newWords = [...words];
      newWords[index] = fullForm;
      variations.add(newWords.join(' '));
    }
    
    // If it's a full form, add the abbreviations
    if (FANTOIR_ABBREVIATIONS[wordLower]) {
      FANTOIR_ABBREVIATIONS[wordLower].forEach(abbrev => {
        const newWords = [...words];
        newWords[index] = abbrev;
        variations.add(newWords.join(' '));
      });
    }
  });

  // Also add a version with all normalized words
  const allNormalizedWords = words.map(word => {
    const wordLower = word.toLowerCase();
    return ABBREVIATION_TO_FULL[wordLower] || word;
  });
  variations.add(allNormalizedWords.join(' '));

  return Array.from(variations);
}

/**
 * Creates a SQL condition to search in a column with address normalization
 * Compatible with PostgreSQL and unaccent function
 */
export function createAddressSearchCondition(
  column: string, 
  query: string, 
  paramName: string = 'query'
): { condition: string; parameters: Record<string, any> } {
  const variations = normalizeAddressQuery(query);
  
  if (variations.length === 1) {
    return {
      condition: `upper(unaccent(${column})) like '%' || upper(unaccent(:${paramName})) || '%'`,
      parameters: { [paramName]: variations[0] }
    };
  }

  const conditions = variations.map((_, index) => 
    `upper(unaccent(${column})) like '%' || upper(unaccent(:${paramName}_${index})) || '%'`
  ).join(' OR ');

  const parameters = variations.reduce((acc, variation, index) => {
    acc[`${paramName}_${index}`] = variation;
    return acc;
  }, {} as Record<string, string>);

  return {
    condition: `(${conditions})`,
    parameters
  };
}

/**
 * Simplified version for array_to_string queries as in housingRepository
 */
export function createArrayAddressSearchCondition(
  column: string,
  separator: string,
  query: string,
  paramName: string = 'query'
): { condition: string; parameters: Record<string, any> } {
  const variations = normalizeAddressQuery(query);
  
  const conditions = variations.map((_, index) => 
    `replace(upper(unaccent(array_to_string(${column}, '${separator}'))), ' ', '') like '%' || replace(upper(unaccent(:${paramName}_${index})), ' ','') || '%'`
  ).join(' OR ');

  const parameters = variations.reduce((acc, variation, index) => {
    acc[`${paramName}_${index}`] = variation;
    return acc;
  }, {} as Record<string, string>);

  return {
    condition: `(${conditions})`,
    parameters
  };
}

export default {
  normalizeAddressQuery,
  createAddressSearchCondition,
  createArrayAddressSearchCondition,
  FANTOIR_ABBREVIATIONS,
  ABBREVIATION_TO_FULL
};
