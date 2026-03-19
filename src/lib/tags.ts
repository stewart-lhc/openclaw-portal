export function parseTags(tags: string): string[] {
  if (!tags) return []
  return [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))]
}

export function formatTags(tags: string[]): string {
  return tags.join(', ')
}
