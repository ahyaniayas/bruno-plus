/**
 * Helpers shared by the Git panel tabs.
 */

/**
 * Split a repository-relative path into its directory and file name.
 * Bruno collections nest deeply, so the file name is what matters visually.
 */
export const splitFilePath = (filePath = '') => {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return { dir: '', name: normalized };
  return { dir: normalized.slice(0, lastSlash + 1), name: normalized.slice(lastSlash + 1) };
};

/**
 * Map a git status letter to the single character shown next to the file.
 * `?` is an untracked file, which reads better as `A` (added).
 */
export const statusLetter = (status) => {
  switch (status) {
    case 'M':
      return 'M';
    case 'A':
      return 'A';
    case 'D':
      return 'D';
    case 'R':
      return 'R';
    case 'U':
      return '!';
    case '?':
      return 'A';
    default:
      return 'M';
  }
};

export const statusClass = (status) => {
  switch (status) {
    case 'A':
    case '?':
      return 'added';
    case 'D':
      return 'deleted';
    case 'U':
      return 'conflicted';
    default:
      return 'modified';
  }
};

/**
 * Build a short "N insertions, M deletions" summary for a stash entry.
 */
export const formatStashStats = (stash) => {
  const parts = [];
  if (stash.filesChanged) parts.push(`${stash.filesChanged} file${stash.filesChanged === 1 ? '' : 's'}`);
  if (stash.insertions) parts.push(`+${stash.insertions}`);
  if (stash.deletions) parts.push(`-${stash.deletions}`);
  return parts.join(', ');
};
