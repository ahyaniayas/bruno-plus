import React from 'react';
import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  border-top: 1px solid ${(props) => props.theme.border.border1};

  .diff-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.subtext1};
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    flex-shrink: 0;
  }

  .diff-file-name {
    font-family: var(--font-mono, monospace);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    direction: rtl;
    text-align: left;
  }

  .diff-body {
    flex: 1;
    overflow: auto;
    min-height: 0;
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    line-height: 1.5;
  }

  .diff-line {
    display: flex;
    white-space: pre;
    padding: 0 8px;
  }

  .diff-line-content {
    flex: 1;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .diff-line.add {
    background: ${(props) => props.theme.status.success.background};
    color: ${(props) => props.theme.status.success.text};
  }

  .diff-line.del {
    background: ${(props) => props.theme.status.danger.background};
    color: ${(props) => props.theme.status.danger.text};
  }

  .diff-line.hunk {
    color: ${(props) => props.theme.colors.text.subtext1};
    background: ${(props) => props.theme.background.surface1};
    padding-top: 2px;
    padding-bottom: 2px;
  }

  .diff-line.meta {
    color: ${(props) => props.theme.colors.text.subtext2};
  }

  .diff-empty {
    padding: 16px;
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.subtext1};
  }

  .diff-truncated {
    padding: 8px 10px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.subtext1};
    border-top: 1px solid ${(props) => props.theme.border.border1};
  }
`;

// Rendering a multi-megabyte diff would lock the renderer, so cap what we emit.
export const MAX_RENDERED_LINES = 3000;

export const classifyDiffLine = (line) => {
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('diff --git') || line.startsWith('index ')) return 'meta';
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'del';
  return '';
};

/**
 * Minimal unified-diff renderer. Deliberately line based: Bruno collections are
 * mostly small text files, and this avoids pulling a diff parser into the
 * renderer bundle just to colour two colours of line.
 */
const DiffViewer = ({ diff, filePath }) => {
  if (!diff) {
    return (
      <StyledWrapper>
        <div className="diff-empty">No changes to show for this file.</div>
      </StyledWrapper>
    );
  }

  const allLines = diff.split('\n');
  const truncated = allLines.length > MAX_RENDERED_LINES;
  const lines = truncated ? allLines.slice(0, MAX_RENDERED_LINES) : allLines;

  return (
    <StyledWrapper data-testid="git-diff-viewer">
      <div className="diff-toolbar">
        <span className="diff-file-name" title={filePath}>
          {filePath}
        </span>
      </div>
      <div className="diff-body">
        {lines.map((line, index) => (
          <div key={index} className={`diff-line ${classifyDiffLine(line)}`}>
            <span className="diff-line-content">{line || ' '}</span>
          </div>
        ))}
      </div>
      {truncated && (
        <div className="diff-truncated">
          Diff truncated — showing the first {MAX_RENDERED_LINES} of {allLines.length} lines.
        </div>
      )}
    </StyledWrapper>
  );
};

export default DiffViewer;
