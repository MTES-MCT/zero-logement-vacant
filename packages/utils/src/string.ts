export function slugify(text: string): string {
  return (
    text
      .toString()
      .toLowerCase()
      .trim()
      // Using regular expressions because otherwise "replace" only handles the first occurrence
      .replace(/\s+/g, '-') // Replaces spaces with dashes
      .replace(/&/g, '-and-') // Replaces "&" with "and"
      .replace(/[^\w-]+/g, '') // Removes all non-alphanumeric characters or dashes
      .replace(/--+/g, '-') // Replaces multiple consecutive dashes with a single dash
  );
}
