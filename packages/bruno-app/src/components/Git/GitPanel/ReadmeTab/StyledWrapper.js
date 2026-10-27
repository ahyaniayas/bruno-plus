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

  /* VS Code-style top bar */
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
    min-width: 0;
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
    color: #4fc1ff;
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

  .vscode-view-badge {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 1px 6px;
    border-radius: 8px;
    background: ${(props) => (props.$isDark ? '#333333' : '#e5e7eb')};
    color: ${(props) => (props.$isDark ? '#aaaaaa' : '#555555')};
    font-weight: 500;
  }

  .vscode-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
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

  /* Editor Canvas */
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
      color: ${(props) => (props.$isDark ? '#858585' : '#6e7781')} !important;
      padding: 0 8px 0 5px;
    }

    .CodeMirror-cursor {
      border-left: 2px solid ${(props) => (props.$isDark ? '#aeafad' : '#007acc')} !important;
    }

    .CodeMirror-selected,
    .CodeMirror-focused .CodeMirror-selected {
      background: ${(props) => (props.$isDark ? '#264f78' : '#add6ff')} !important;
    }

    .CodeMirror-line {
      padding: 0 8px;
    }
  }

  .vscode-fallback-textarea {
    width: 100%;
    height: 100%;
    padding: 10px;
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    background: ${(props) => (props.$isDark ? '#1e1e1e' : '#ffffff')};
    color: ${(props) => (props.$isDark ? '#d4d4d4' : '#1f2328')};
    border: none;
    outline: none;
    resize: none;
    line-height: 1.6;
  }

  /* Status Bar */
  .vscode-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 22px;
    background: ${(props) => (props.$isDark ? '#007acc' : '#005fb8')};
    color: #ffffff;
    font-size: 11px;
    padding: 0 10px;
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
    opacity: 0.9;
  }

  /* Markdown Viewer (Preview) */
  .readme-preview-wrapper {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding: 16px 20px;
    cursor: default;
  }

  .readme-empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    text-align: center;
    color: ${(props) => (props.$isDark ? '#858585' : '#6e7781')};
    font-size: 13px;
    gap: 12px;
  }

  .readme-markdown-body {
    font-size: 13px;
    line-height: 1.6;
    color: ${(props) => (props.$isDark ? '#d4d4d4' : '#1f2328')};
    word-wrap: break-word;

    h1, h2, h3, h4, h5, h6 {
      margin-top: 18px;
      margin-bottom: 8px;
      font-weight: 600;
      line-height: 1.3;
      color: ${(props) => (props.$isDark ? '#ffffff' : '#111827')};
      border-bottom: 1px solid ${(props) => (props.$isDark ? '#2d2d2d' : '#e5e7eb')};
      padding-bottom: 4px;

      &:first-child {
        margin-top: 0;
      }
    }

    h1 { font-size: 1.6em; }
    h2 { font-size: 1.3em; }
    h3 { font-size: 1.15em; border-bottom: none; }
    h4 { font-size: 1.05em; border-bottom: none; }

    p {
      margin-top: 0;
      margin-bottom: 12px;
    }

    hr {
      height: 1px;
      background: ${(props) => (props.$isDark ? '#2d2d2d' : '#e5e7eb')};
      border: 0;
      margin: 16px 0;
    }

    ul, ol {
      padding-left: 20px;
      margin-top: 0;
      margin-bottom: 12px;
    }

    li {
      margin-bottom: 4px;
    }

    blockquote {
      margin: 0 0 12px 0;
      padding: 4px 12px;
      border-left: 3px solid #007acc;
      color: ${(props) => (props.$isDark ? '#9da5b4' : '#57606a')};
      background: ${(props) => (props.$isDark ? '#252526' : '#f8fafc')};
      border-radius: 0 4px 4px 0;
    }

    code {
      font-family: var(--font-mono, Menlo, Monaco, monospace);
      font-size: 0.9em;
      padding: 2px 5px;
      border-radius: 3px;
      background: ${(props) => (props.$isDark ? '#2d2d2d' : '#f1f5f9')};
      color: ${(props) => (props.$isDark ? '#e06c75' : '#c7254e')};
    }

    pre {
      padding: 10px 12px;
      overflow: auto;
      font-size: 12px;
      line-height: 1.45;
      background: ${(props) => (props.$isDark ? '#252526' : '#f6f8fa')};
      border: 1px solid ${(props) => (props.$isDark ? '#333333' : '#e1e4e8')};
      border-radius: 6px;
      margin-bottom: 12px;

      code {
        padding: 0;
        background: transparent;
        color: inherit;
      }
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 14px;
      font-size: 12px;

      th, td {
        padding: 6px 10px;
        border: 1px solid ${(props) => (props.$isDark ? '#333333' : '#e1e4e8')};
        text-align: left;
      }

      th {
        font-weight: 600;
        background: ${(props) => (props.$isDark ? '#252526' : '#f6f8fa')};
      }

      tr:nth-child(2n) {
        background: ${(props) => (props.$isDark ? '#222222' : '#fbfcfd')};
      }
    }

    a {
      color: #007acc;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

export default StyledWrapper;
