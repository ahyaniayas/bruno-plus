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

/**
 * Parse conflicting file paths from git error output when pull is rejected due to local changes.
 * Handles both single-line and multi-line error outputs from git for tracked and untracked files.
 */
export const parseConflictingFilesFromError = (errorOrMsg) => {
  const errorMsg = typeof errorOrMsg === 'string' ? errorOrMsg : (errorOrMsg?.rawMessage || errorOrMsg?.message || '');
  if (!errorMsg || typeof errorMsg !== 'string') return [];
  const match = errorMsg.match(/overwritten by (?:merge|checkout):\s*([\s\S]*?)(?:Please\s+(?:commit|stash|move|remove)|Aborting|$)/i);
  if (!match || !match[1]) return [];
  return match[1]
    .split(/[\r\n\t]+|\s{2,}/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || line.length === 0) return false;
      const lower = line.toLowerCase();
      if (lower.startsWith('error:') || lower.startsWith('fatal:')) return false;
      if (lower.startsWith('please ') || lower.includes('before you ')) return false;
      if (lower.startsWith('aborting')) return false;
      return true;
    });
};

/**
 * Convert technical Git / Electron IPC error outputs into friendly, human-readable
 * explanations for non-technical users.
 */
export const formatGitError = (rawInput, fallback = 'Operation failed') => {
  const rawMsg = (typeof rawInput === 'string' ? rawInput : (rawInput?.rawMessage || rawInput?.message)) || fallback;
  if (!rawMsg || typeof rawMsg !== 'string') return fallback;

  // Strip Electron IPC wrapper prefixes: "Error invoking remote method '...': Error: "
  let cleaned = rawMsg.replace(/^Error invoking remote method '[^']+':\s*/i, '');
  cleaned = cleaned.replace(/^Error:\s*/i, '').trim();

  // 1. Local or untracked changes overwritten by merge (fast-forward pull conflict)
  const isUntracked = /untracked working tree files/i.test(cleaned);
  const files = parseConflictingFilesFromError(cleaned);
  if (files.length > 0) {
    if (isUntracked) {
      if (files.length === 1) {
        return `Pull blocked: Untracked file "${files[0]}" would be overwritten by incoming updates. Please move, remove, or discard it below.`;
      }
      const preview = files.slice(0, 3).join(', ');
      const more = files.length > 3 ? ` and ${files.length - 3} more` : '';
      return `Pull blocked: Untracked files (${preview}${more}) would be overwritten by incoming updates. Please move, remove, or discard them below.`;
    }

    if (files.length === 1) {
      return `Pull blocked: You have uncommitted local changes in "${files[0]}" that conflict with incoming updates. Please commit, stash, or discard your changes below.`;
    }
    const preview = files.slice(0, 3).join(', ');
    const more = files.length > 3 ? ` and ${files.length - 3} more` : '';
    return `Pull blocked: You have uncommitted local changes in ${files.length} files (${preview}${more}) that conflict with incoming updates. Please commit, stash, or discard your changes below.`;
  }

  // 3. Fast-forward not possible (diverged branches)
  if (/not possible to fast-forward/i.test(cleaned) || /refusing to merge unrelated histories/i.test(cleaned)) {
    return 'Fast-forward pull not possible: Your branch and the remote branch have diverged with different commits.';
  }

  // 4. Merge conflict in progress
  if (/you have not concluded your merge/i.test(cleaned)) {
    return 'Merge in progress: A merge is currently in progress. Please complete or abort the merge before continuing.';
  }

  // 5. Merge conflicts
  if (/merge conflict/i.test(cleaned) || /automatic merge failed/i.test(cleaned)) {
    return 'Merge conflict: Incoming updates conflict with your local changes. Please resolve or discard the conflicts.';
  }

  // 6. Authentication / permission errors
  if (/authentication failed/i.test(cleaned) || /could not read Username/i.test(cleaned)) {
    return 'Authentication failed: Please check your repository credentials or access permissions.';
  }
  if (/permission denied \(publickey\)/i.test(cleaned)) {
    return 'Access denied: SSH key authentication failed. Please check your SSH keys.';
  }

  // 7. Network / connection errors
  if (/could not resolve host/i.test(cleaned)) {
    return 'Network error: Unable to reach the remote repository. Please check your internet connection.';
  }
  if (/connection refused/i.test(cleaned) || /connection timed out/i.test(cleaned) || /operation timed out/i.test(cleaned)) {
    return 'Connection failed: Could not connect to the remote Git server.';
  }

  // 8. Branch tracking / not found
  if (/no tracking information/i.test(cleaned) || /couldn't find remote ref/i.test(cleaned)) {
    return 'Branch not found: There is no matching tracking branch on the remote repository.';
  }

  // 9. General Git noise cleanup
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('Updating ') && !l.startsWith('From ') && !l.includes('-> FETCH_HEAD'));

  let result = lines.join(' ')
    .replace(/^error:\s*/i, '')
    .replace(/^fatal:\s*/i, '')
    .replace(/Aborting\.?$/i, '')
    .trim();

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
    if (!result.endsWith('.')) result += '.';
    return result;
  }

  return fallback;
};
