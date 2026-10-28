import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 72vh;
  min-height: 480px;

  .resolver-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: ${(props) => props.theme.background.surface1};
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    flex-shrink: 0;
    gap: 12px;
    font-size: 12px;
  }

  .resolver-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .resolver-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;

    &.unresolved {
      background: ${(props) => props.theme.status.warning.background};
      color: ${(props) => props.theme.status.warning.text};
      border: 1px solid ${(props) => props.theme.status.warning.border || 'transparent'};
    }

    &.resolved {
      background: ${(props) => props.theme.status.success.background};
      color: ${(props) => props.theme.status.success.text};
      border: 1px solid ${(props) => props.theme.status.success.border || 'transparent'};
    }
  }

  .resolver-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .resolver-editor-container {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;

    .CodeMirror {
      height: 100% !important;
      font-family: var(--font-mono, monospace);
      font-size: 12px;
      line-height: 1.5;
    }
  }

  /* CodeLens Action Bar inside CodeMirror */
  .git-codelens-toolbar {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${(props) => props.theme.background.surface2};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 4px;
    padding: 2px 8px;
    margin: 2px 0 3px 2px;
    font-size: 11px;
    font-family: var(--font-sans, sans-serif);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    z-index: 5;
  }

  .git-codelens-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    font-weight: 500;
    padding: 2px 4px;
    border-radius: 3px;
    transition: background 0.15s ease;

    &.current {
      color: #2ea44f;
      &:hover {
        background: rgba(46, 164, 79, 0.15);
      }
    }

    &.incoming {
      color: #0969da;
      &:hover {
        background: rgba(9, 105, 218, 0.15);
      }
    }

    &.both {
      color: ${(props) => props.theme.colors.text.subtext1};
      &:hover {
        background: ${(props) => props.theme.background.surface3 || 'rgba(120, 120, 120, 0.15)'};
      }
    }
  }

  .git-codelens-divider {
    color: ${(props) => props.theme.border.border1};
  }

  /* Conflict Line Highlights */
  .git-conflict-current-line {
    background-color: rgba(46, 160, 67, 0.12) !important;
  }

  .git-conflict-incoming-line {
    background-color: rgba(56, 139, 253, 0.12) !important;
  }

  .git-conflict-marker-start {
    background-color: rgba(46, 160, 67, 0.22) !important;
    font-weight: 600;
  }

  .git-conflict-marker-sep {
    background-color: rgba(120, 120, 120, 0.18) !important;
    font-weight: 600;
  }

  .git-conflict-marker-end {
    background-color: rgba(56, 139, 253, 0.22) !important;
    font-weight: 600;
  }

  /* Fallback view for tests / non-CodeMirror */
  .resolver-fallback-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 10px;
    gap: 10px;

    .resolver-fallback-conflicts {
      max-height: 160px;
      overflow-y: auto;
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 4px;
      padding: 8px;
    }

    .resolver-fallback-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 0;
      border-bottom: 1px solid ${(props) => props.theme.border.border0};
    }

    textarea {
      flex: 1;
      width: 100%;
      font-family: var(--font-mono, monospace);
      font-size: 12px;
      padding: 8px;
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 4px;
      background: ${(props) => props.theme.background.surface0};
      color: ${(props) => props.theme.text};
      resize: none;
    }
  }

  .resolver-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-top: 1px solid ${(props) => props.theme.border.border1};
    background: ${(props) => props.theme.background.surface1};
    flex-shrink: 0;
  }

  .resolver-footer-hint {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.subtext1};
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

export default StyledWrapper;
