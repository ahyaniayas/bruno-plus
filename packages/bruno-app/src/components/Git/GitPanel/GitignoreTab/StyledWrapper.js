import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  background: ${(props) => (props.$isDark ? '#1e1e1e' : '#ffffff')};
  color: ${(props) => (props.$isDark ? '#d4d4d4' : '#1f2328')};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

  .vscode-top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    background: ${(props) => (props.$isDark ? '#252526' : '#f3f3f3')};
    border-bottom: 1px solid ${(props) => (props.$isDark ? '#1e1e1e' : '#e5e7eb')};
    padding: 0 10px;
    user-select: none;
    flex-shrink: 0;
  }

  .vscode-tab-group {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .vscode-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 100%;
    padding: 0 12px;
    background: ${(props) => (props.$isDark ? '#1e1e1e' : '#ffffff')};
    color: ${(props) => (props.$isDark ? '#ffffff' : '#1f2328')};
    border-top: 2px solid #007acc;
    border-right: 1px solid ${(props) => (props.$isDark ? '#252526' : '#e5e7eb')};
    font-size: 12px;
    font-weight: 500;
  }

  .vscode-file-icon {
    color: #f05033;
    display: flex;
    align-items: center;
  }

  .vscode-dirty-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${(props) => (props.$isDark ? '#ffffff' : '#007acc')};
    display: inline-block;
  }

  .vscode-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .vscode-template-select {
    font-size: 11px;
    padding: 3px 6px;
    border-radius: 3px;
    background: ${(props) => (props.$isDark ? '#3c3c3c' : '#ffffff')};
    color: ${(props) => (props.$isDark ? '#cccccc' : '#333333')};
    border: 1px solid ${(props) => (props.$isDark ? '#4b4b4b' : '#d1d5db')};
    outline: none;
    cursor: pointer;

    &:hover {
      border-color: #007acc;
    }
  }

  .vscode-editor-canvas {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;

    .CodeMirror {
      height: 100%;
      width: 100%;
      font-family: var(--font-mono, Menlo, Monaco, 'Courier New', monospace);
      font-size: 12px;
      line-height: 1.6;
      background: ${(props) => (props.$isDark ? '#1e1e1e' : '#ffffff')} !important;
      color: ${(props) => (props.$isDark ? '#d4d4d4' : '#1f2328')} !important;
    }

    .CodeMirror-gutters {
      background: ${(props) => (props.$isDark ? '#1e1e1e' : '#ffffff')} !important;
      border-right: 1px solid ${(props) => (props.$isDark ? '#2b2b2b' : '#e5e7eb')} !important;
    }

    .CodeMirror-linenumber {
      color: ${(props) => (props.$isDark ? '#858585' : '#a0a0a0')} !important;
      padding: 0 8px 0 4px;
    }

    .CodeMirror-activeline-background {
      background: ${(props) => (props.$isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)')};
    }

    .CodeMirror-cursor {
      border-left: 2px solid ${(props) => (props.$isDark ? '#aeafad' : '#000000')} !important;
    }

    .CodeMirror-selected {
      background: ${(props) => (props.$isDark ? '#264f78' : '#add6ff')} !important;
    }

    .cm-comment {
      color: ${(props) => (props.$isDark ? '#6a9955' : '#008000')} !important;
      font-style: italic;
    }

    .cm-variable,
    .cm-keyword {
      color: ${(props) => (props.$isDark ? '#569cd6' : '#0000ff')} !important;
    }

    .cm-string {
      color: ${(props) => (props.$isDark ? '#ce9178' : '#a31515')} !important;
    }
  }

  .vscode-fallback-textarea {
    width: 100%;
    height: 100%;
    resize: none;
    border: none;
    outline: none;
    padding: 8px 12px;
    font-family: var(--font-mono, Menlo, Monaco, 'Courier New', monospace);
    font-size: 12px;
    line-height: 1.6;
    background: ${(props) => (props.$isDark ? '#1e1e1e' : '#ffffff')};
    color: ${(props) => (props.$isDark ? '#d4d4d4' : '#1f2328')};
  }

  .vscode-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 22px;
    padding: 0 10px;
    background: #007acc;
    color: #ffffff;
    font-size: 11px;
    user-select: none;
    flex-shrink: 0;
  }

  .vscode-status-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .vscode-status-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
`;

export default StyledWrapper;
