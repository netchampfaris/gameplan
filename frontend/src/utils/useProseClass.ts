/**
 * Returns the appropriate prose classes based on content creation date.
 *
 * Content created before April 14, 2026 was authored with prose-sm which had
 * automatic paragraph margins (0.5rem top/bottom). prose-v3 removes these margins
 * so old content needs them restored via the prose-p-spacing modifier.
 *
 * Usage:
 *   new content: "prose prose-v3"
 *   old content: "prose prose-v3 prose-p-spacing"
 */

const PROSE_V3_CUTOFF = new Date('2026-04-14T00:00:00')

export function useProseClass(creation: string | Date | null | undefined): string {
  if (!creation) return 'prose-v3'
  const isOldContent = new Date(creation) < PROSE_V3_CUTOFF
  return isOldContent ? 'prose-v3 prose-p-spacing' : 'prose-v3'
}
