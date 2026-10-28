/**
 * Parses Git merge conflict markers from text.
 *
 * Conflict blocks follow standard Git format:
 * <<<<<<< [currentLabel / HEAD]
 * [currentContent]
 * =======
 * [incomingContent]
 * >>>>>>> [incomingLabel / remoteBranch]
 */

export const parseConflicts = (text = '') => {
  if (typeof text !== 'string' || !text.includes('<<<<<<<')) {
    return [];
  }

  const lines = text.split('\n');
  const conflicts = [];
  let inConflict = false;
  let inIncoming = false;
  let startLine = -1;
  let separatorLine = -1;
  let currentLabel = '';
  let incomingLabel = '';
  let currentLines = [];
  let incomingLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inConflict) {
      if (line.startsWith('<<<<<<<')) {
        inConflict = true;
        inIncoming = false;
        startLine = i;
        currentLabel = line.slice(7).trim() || 'Current Change (HEAD)';
        currentLines = [];
        incomingLines = [];
      }
    } else if (!inIncoming) {
      if (line.startsWith('=======')) {
        inIncoming = true;
        separatorLine = i;
      } else {
        currentLines.push(line);
      }
    } else {
      if (line.startsWith('>>>>>>>')) {
        incomingLabel = line.slice(7).trim() || 'Incoming Change';
        conflicts.push({
          id: conflicts.length + 1,
          startLine,
          separatorLine,
          endLine: i,
          currentLabel,
          incomingLabel,
          currentContent: currentLines.join('\n'),
          incomingContent: incomingLines.join('\n')
        });
        inConflict = false;
        inIncoming = false;
      } else {
        incomingLines.push(line);
      }
    }
  }

  return conflicts;
};

/**
 * Replaces a single conflict block in text with the resolved content.
 * resolution: 'current' | 'incoming' | 'both'
 */
export const resolveConflictInText = (text, conflict, resolution) => {
  const lines = text.split('\n');
  const { startLine, endLine, currentContent, incomingContent } = conflict;

  let replacementLines = [];
  if (resolution === 'current') {
    replacementLines = currentContent.length > 0 ? currentContent.split('\n') : [];
  } else if (resolution === 'incoming') {
    replacementLines = incomingContent.length > 0 ? incomingContent.split('\n') : [];
  } else if (resolution === 'both') {
    const parts = [];
    if (currentContent.length > 0) parts.push(currentContent);
    if (incomingContent.length > 0) parts.push(incomingContent);
    const combined = parts.join('\n');
    replacementLines = combined.length > 0 ? combined.split('\n') : [];
  }

  lines.splice(startLine, endLine - startLine + 1, ...replacementLines);
  return lines.join('\n');
};

/**
 * Resolves all conflicts in text at once by iterating backwards.
 * resolution: 'current' | 'incoming'
 */
export const resolveAllConflictsInText = (text, resolution) => {
  const conflicts = parseConflicts(text);
  if (conflicts.length === 0) return text;

  let result = text;
  // Iterate in reverse order so line numbers remain valid
  for (let i = conflicts.length - 1; i >= 0; i--) {
    const currentList = parseConflicts(result);
    if (currentList[i]) {
      result = resolveConflictInText(result, currentList[i], resolution);
    }
  }

  return result;
};
