import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import { ThemeContext } from 'providers/Theme';
import {
  IconArrowBackUp,
  IconBrandGit,
  IconDeviceFloppy,
  IconEdit,
  IconEye,
  IconFilePlus,
  IconFileText,
  IconPlus
} from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import { getReadme, saveReadme } from 'providers/ReduxStore/slices/git/actions';
import StyledWrapper from './StyledWrapper';

let CodeMirror;
const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true || IS_TEST;

if (!SERVER_RENDERED) {
  try {
    CodeMirror = require('codemirror');
    try {
      require('codemirror/mode/markdown/markdown');
    } catch (_) {}
  } catch (_) {
    CodeMirror = null;
  }
}

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true
});

const TEMPLATES = [
  {
    label: '+ Overview & Quickstart',
    value: '\n## Overview\n\nDetailed API request collection and test specifications.\n\n## Quick Start\n\n1. Select your active environment.\n2. Run requests or automated test suites.\n'
  },
  {
    label: '+ Environment Variables Table',
    value: '\n## Environments\n\n| Variable | Description | Example |\n| --- | --- | --- |\n| `baseUrl` | Server root endpoint | `http://localhost:3000` |\n| `token` | Authentication Bearer token | `secret-token` |\n'
  },
  {
    label: '+ API Endpoints Table',
    value: '\n## Key Endpoints\n\n| Method | Route | Description |\n| --- | --- | --- |\n| `GET` | `/api/v1/health` | Service health status |\n| `POST` | `/api/v1/auth/login` | User authentication |\n'
  },
  {
    label: '+ Contribution Guidelines',
    value: '\n## Contributing\n\n- Group requests logically by resource folder.\n- Never commit live secrets or sensitive tokens.\n- Include assertion tests for critical endpoints.\n'
  }
];

const INITIAL_README_TEMPLATE = `# Collection Documentation

API collection and test specifications.

## Overview

Describe your API collection, setup steps, and authentication requirements here.

## Environments

| Variable | Description | Default |
| --- | --- | --- |
| \`baseUrl\` | API host URL | \`http://localhost:3000\` |
`;

const ReadmeTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const themeContext = useContext(ThemeContext);
  const isDark = themeContext ? themeContext.displayedTheme === 'dark' : true;

  const [content, setContent] = useState('');
  const [exists, setExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [filename, setFilename] = useState('README.md');
  const [filePath, setFilePath] = useState('README.md');

  const initialContentRef = useRef('');
  const editorNodeRef = useRef(null);
  const cmInstanceRef = useRef(null);
  const handleSaveRef = useRef(null);

  // Load README on mount
  useEffect(() => {
    let active = true;
    dispatch(getReadme(collectionPath))
      .then((data) => {
        if (!active) return;
        const initial = data?.content || '';
        setContent(initial);
        initialContentRef.current = initial;
        setExists(Boolean(data?.exists));
        if (data?.filename) setFilename(data.filename);
        if (data?.path) setFilePath(data.path);
        setIsDirty(false);
        // By default, prioritize MD viewer mode when file exists
        setIsEditing(false);
      })
      .catch((err) => {
        if (active) toast.error(err?.message || 'Failed to read README');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [collectionPath, dispatch]);

  const handleCreateReadme = async () => {
    if (creating) return;
    setCreating(true);
    const starter = INITIAL_README_TEMPLATE;
    try {
      await dispatch(saveReadme(collectionUid, collectionPath, starter));
      setContent(starter);
      initialContentRef.current = starter;
      setExists(true);
      setIsDirty(false);
      setIsEditing(true); // Switch to editor so user can immediately customize
      toast.success('README.md created');
    } catch (error) {
      toast.error(error?.message || 'Failed to create README');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const toSave = cmInstanceRef.current ? cmInstanceRef.current.getValue() : content;
    try {
      await dispatch(saveReadme(collectionUid, collectionPath, toSave));
      initialContentRef.current = toSave;
      setContent(toSave);
      setExists(true);
      setIsDirty(false);
      toast.success(`${filename} saved`);
    } catch (error) {
      toast.error(error?.message || `Failed to save ${filename}`);
    } finally {
      setSaving(false);
    }
  };

  handleSaveRef.current = handleSave;

  const handleReset = () => {
    const original = initialContentRef.current;
    if (cmInstanceRef.current) {
      cmInstanceRef.current.setValue(original);
    }
    setContent(original);
    setIsDirty(false);
    toast('Reverted changes', { icon: '↩️' });
  };

  const handleApplyTemplate = (e) => {
    const selectedTemplate = e.target.value;
    if (!selectedTemplate) return;

    if (cmInstanceRef.current) {
      const cur = cmInstanceRef.current.getValue();
      const updated = cur ? `${cur.trimEnd()}\n${selectedTemplate}` : selectedTemplate.trimStart();
      cmInstanceRef.current.setValue(updated);
      setContent(updated);
      setIsDirty(updated !== initialContentRef.current);
      cmInstanceRef.current.focus();
    } else {
      setContent((prev) => {
        const updated = prev ? `${prev.trimEnd()}\n${selectedTemplate}` : selectedTemplate.trimStart();
        setIsDirty(updated !== initialContentRef.current);
        return updated;
      });
    }
    e.target.value = '';
  };

  // Mount CodeMirror when entering editing mode
  useEffect(() => {
    if (loading || !exists || !isEditing || !editorNodeRef.current || !CodeMirror) return;

    // Clean up any existing instance
    if (cmInstanceRef.current) {
      cmInstanceRef.current = null;
    }

    const editor = CodeMirror(editorNodeRef.current, {
      value: content,
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      mode: 'markdown',
      keyMap: 'sublime',
      theme: isDark ? 'monokai' : 'default',
      extraKeys: {
        'Cmd-S': () => handleSaveRef.current?.(),
        'Ctrl-S': () => handleSaveRef.current?.()
      }
    });

    cmInstanceRef.current = editor;

    editor.on('change', (cm) => {
      const val = cm.getValue();
      setContent(val);
      setIsDirty(val !== initialContentRef.current);
    });

    editor.on('cursorActivity', (cm) => {
      const cursor = cm.getCursor();
      setCursorPos({ line: cursor.line + 1, col: cursor.ch + 1 });
    });

    return () => {
      if (cmInstanceRef.current) {
        cmInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, exists, isEditing]);

  // Update theme when displayedTheme changes
  useEffect(() => {
    if (cmInstanceRef.current) {
      cmInstanceRef.current.setOption('theme', isDark ? 'monokai' : 'default');
    }
  }, [isDark]);

  // Sanitize and render markdown for viewer mode
  const renderedHtml = useMemo(() => {
    if (!content) return '';
    try {
      const rawHtml = md.render(content);
      return typeof window !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
    } catch (_) {
      return '';
    }
  }, [content]);

  if (loading) {
    return <div className="git-spinner">Loading README…</div>;
  }

  if (!exists) {
    return (
      <div className="git-scroll" style={{ padding: '8px 10px' }} data-testid="git-readme-empty-state">
        <div className="git-init-card">
          <div className="git-init-icon">
            <IconFilePlus size={22} strokeWidth={1.5} />
          </div>
          <h2 className="git-init-title">No README file</h2>
          <p className="git-init-description">
            This repository does not have a README file yet. Add documentation to help others understand your collection, environment variables, and request workflows.
          </p>
          <Button
            size="sm"
            variant="filled"
            color="primary"
            icon={<IconPlus size={14} strokeWidth={2} />}
            loading={creating}
            onClick={handleCreateReadme}
            data-testid="git-create-readme-btn"
          >
            Create README.md
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StyledWrapper $isDark={isDark} data-testid="git-readme-tab">
      {/* Top Header / VS Code Tab Bar */}
      <div className="vscode-top-bar">
        <div className="vscode-tab-group">
          <div className="vscode-tab" title={filePath}>
            <span className="vscode-file-icon">
              <IconFileText size={14} strokeWidth={2} />
            </span>
            <span>{filename}</span>
            {isDirty && <span className="vscode-dirty-dot" title="Unsaved changes" data-testid="readme-dirty-dot" />}
          </div>
          <span className="vscode-view-badge" style={{ marginLeft: 8 }}>
            {isEditing ? 'Editor' : 'Preview'}
          </span>
        </div>

        <div className="vscode-toolbar">
          {isEditing ? (
            <>
              <select
                className="vscode-template-select"
                onChange={handleApplyTemplate}
                defaultValue=""
                data-testid="readme-template-select"
                title="Append preset sections"
              >
                <option value="" disabled>
                  + Snippets
                </option>
                {TEMPLATES.map((t) => (
                  <option key={t.label} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <ActionIcon
                label="Revert changes"
                onClick={handleReset}
                disabled={!isDirty || saving}
                data-testid="readme-reset-btn"
              >
                <IconArrowBackUp size={14} strokeWidth={1.5} />
              </ActionIcon>

              <Button
                size="xs"
                variant="outline"
                icon={<IconEye size={13} strokeWidth={1.5} />}
                onClick={() => setIsEditing(false)}
                data-testid="readme-preview-btn"
              >
                Preview
              </Button>

              <Button
                size="xs"
                variant="filled"
                color="primary"
                icon={<IconDeviceFloppy size={13} strokeWidth={1.5} />}
                disabled={!isDirty || saving}
                loading={saving}
                onClick={handleSave}
                data-testid="readme-save-btn"
              >
                Save
              </Button>
            </>
          ) : (
            <>
              {isDirty && (
                <Button
                  size="xs"
                  variant="filled"
                  color="primary"
                  icon={<IconDeviceFloppy size={13} strokeWidth={1.5} />}
                  loading={saving}
                  onClick={handleSave}
                  data-testid="readme-save-preview-btn"
                >
                  Save
                </Button>
              )}
              <Button
                size="xs"
                variant={isDirty ? 'outline' : 'filled'}
                color="primary"
                icon={<IconEdit size={13} strokeWidth={1.5} />}
                onClick={() => setIsEditing(true)}
                data-testid="readme-edit-btn"
              >
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content: Viewer or Editor */}
      {isEditing ? (
        <>
          <div className="vscode-editor-canvas" ref={editorNodeRef} data-testid="readme-editor-canvas">
            {/* Fallback textarea when CodeMirror is not rendered (e.g. unit tests / SSR) */}
            {!CodeMirror && (
              <textarea
                className="vscode-fallback-textarea"
                value={content}
                onChange={(e) => {
                  const val = e.target.value;
                  setContent(val);
                  setIsDirty(val !== initialContentRef.current);
                }}
                data-testid="readme-editor-textarea"
                placeholder="# Collection Documentation&#10;&#10;Add your markdown documentation here..."
              />
            )}
          </div>

          <div className="vscode-status-bar" data-testid="readme-status-bar">
            <div className="vscode-status-item">
              <IconBrandGit size={12} strokeWidth={2} />
              <span>{repo.currentBranch || 'main'}</span>
              <span style={{ marginLeft: 8, opacity: 0.85 }}>
                {isDirty ? '● Modified' : '✓ Saved'}
              </span>
            </div>

            <div className="vscode-status-right">
              <span>
                Ln {cursorPos.line}, Col {cursorPos.col}
              </span>
              <span>Spaces: 2</span>
              <span>UTF-8</span>
              <span>LF</span>
              <span>markdown</span>
            </div>
          </div>
        </>
      ) : (
        <div
          className="readme-preview-wrapper"
          onDoubleClick={() => setIsEditing(true)}
          title="Double-click to edit"
          data-testid="readme-preview-wrapper"
        >
          {content.trim().length === 0 ? (
            <div className="readme-empty-content" data-testid="readme-empty-content">
              <IconFileText size={32} strokeWidth={1.2} />
              <p>This README file is currently empty.</p>
              <Button
                size="xs"
                variant="filled"
                color="primary"
                icon={<IconEdit size={13} strokeWidth={1.5} />}
                onClick={() => setIsEditing(true)}
              >
                Edit README
              </Button>
            </div>
          ) : (
            <div
              className="readme-markdown-body"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
              data-testid="readme-rendered-content"
            />
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

export default ReadmeTab;
