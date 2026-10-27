import React, { useContext, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { ThemeContext } from 'providers/Theme';
import { IconArrowBackUp, IconBrandGit, IconDeviceFloppy, IconFilePlus, IconPlus } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import { getGitignore, saveGitignore } from 'providers/ReduxStore/slices/git/actions';
import StyledWrapper from './StyledWrapper';

let CodeMirror;
const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true || IS_TEST;

if (!SERVER_RENDERED) {
  try {
    CodeMirror = require('codemirror');
    try {
      require('codemirror/mode/shell/shell');
    } catch (_) {}
  } catch (_) {
    CodeMirror = null;
  }
}

const TEMPLATES = [
  {
    label: '+ Add Node.js',
    value: '\n# Node.js\nnode_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.pnpm-debug.log*\n'
  },
  {
    label: '+ Add Secrets & Env',
    value: '\n# Environment & Secrets\n.env\n.env.*\n*.pem\n*.key\n*.cert\n'
  },
  {
    label: '+ Add OS Files',
    value: '\n# OS Files\n.DS_Store\nThumbs.db\nDesktop.ini\n'
  },
  {
    label: '+ Add Build & Logs',
    value: '\n# Build & Logs\ndist/\nbuild/\nout/\n*.log\n'
  }
];

const GitignoreTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const themeContext = useContext(ThemeContext);
  const isDark = themeContext ? themeContext.displayedTheme === 'dark' : true;

  const [content, setContent] = useState('');
  const [exists, setExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [filePath, setFilePath] = useState('.gitignore');

  const initialContentRef = useRef('');
  const editorNodeRef = useRef(null);
  const cmInstanceRef = useRef(null);
  const handleSaveRef = useRef(null);

  // Load .gitignore on mount
  useEffect(() => {
    let active = true;
    dispatch(getGitignore(collectionPath))
      .then((data) => {
        if (!active) return;
        const initial = data?.content || '';
        setContent(initial);
        initialContentRef.current = initial;
        setExists(Boolean(data?.exists));
        if (data?.path) setFilePath(data.path);
        setIsDirty(false);
      })
      .catch((err) => {
        if (active) toast.error(err?.message || 'Failed to read .gitignore');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [collectionPath, dispatch]);

  const handleCreateGitignore = async () => {
    if (creating) return;
    setCreating(true);
    const initialContent = '';
    try {
      await dispatch(saveGitignore(collectionUid, collectionPath, initialContent));
      setContent(initialContent);
      initialContentRef.current = initialContent;
      setExists(true);
      setIsDirty(false);
      toast.success('.gitignore file created');
    } catch (error) {
      toast.error(error?.message || 'Failed to create .gitignore');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const toSave = cmInstanceRef.current ? cmInstanceRef.current.getValue() : content;
    try {
      await dispatch(saveGitignore(collectionUid, collectionPath, toSave));
      initialContentRef.current = toSave;
      setContent(toSave);
      setExists(true);
      setIsDirty(false);
      toast.success('.gitignore saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save .gitignore');
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

  // Mount CodeMirror
  useEffect(() => {
    if (loading || !exists || !editorNodeRef.current || !CodeMirror) return;

    // Clean up any existing instance
    if (cmInstanceRef.current) {
      cmInstanceRef.current.toTextArea?.();
      cmInstanceRef.current = null;
    }

    const editor = CodeMirror(editorNodeRef.current, {
      value: content,
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      mode: 'shell',
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
  }, [loading, exists]);

  // Update theme when displayedTheme changes
  useEffect(() => {
    if (cmInstanceRef.current) {
      cmInstanceRef.current.setOption('theme', isDark ? 'monokai' : 'default');
    }
  }, [isDark]);

  if (loading) {
    return <div className="git-spinner">Loading .gitignore…</div>;
  }

  if (!exists) {
    return (
      <div className="git-scroll" style={{ padding: '8px 10px' }} data-testid="git-gitignore-empty-state">
        <div className="git-init-card">
          <div className="git-init-icon">
            <IconFilePlus size={22} strokeWidth={1.5} />
          </div>
          <h2 className="git-init-title">No .gitignore file</h2>
          <p className="git-init-description">
            This repository does not have a .gitignore file yet. Create one to specify intentionally untracked files to ignore.
          </p>
          <Button
            size="sm"
            variant="filled"
            color="primary"
            icon={<IconPlus size={14} strokeWidth={2} />}
            loading={creating}
            onClick={handleCreateGitignore}
            data-testid="git-create-gitignore-btn"
          >
            Create .gitignore
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StyledWrapper $isDark={isDark} data-testid="git-gitignore-tab">
      <div className="vscode-top-bar">
        <div className="vscode-tab-group">
          <div className="vscode-tab" title={filePath}>
            <span className="vscode-file-icon">
              <IconBrandGit size={14} strokeWidth={2} />
            </span>
            <span>.gitignore</span>
            {isDirty && <span className="vscode-dirty-dot" title="Unsaved changes" data-testid="gitignore-dirty-dot" />}
          </div>
        </div>

        <div className="vscode-toolbar">
          <select
            className="vscode-template-select"
            onChange={handleApplyTemplate}
            defaultValue=""
            data-testid="gitignore-template-select"
            title="Append preset patterns"
          >
            <option value="" disabled>
              + Quick Presets
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
            data-testid="gitignore-reset-btn"
          >
            <IconArrowBackUp size={14} strokeWidth={1.5} />
          </ActionIcon>

          <Button
            size="xs"
            variant="filled"
            color="primary"
            icon={<IconDeviceFloppy size={13} strokeWidth={1.5} />}
            disabled={!isDirty || saving}
            loading={saving}
            onClick={handleSave}
            data-testid="gitignore-save-btn"
          >
            Save
          </Button>
        </div>
      </div>

      <div className="vscode-editor-canvas" ref={editorNodeRef} data-testid="gitignore-editor-canvas">
        {/* Render fallback textarea when CodeMirror is not loaded (e.g. unit tests) */}
        {!CodeMirror && (
          <textarea
            className="vscode-fallback-textarea"
            value={content}
            onChange={(e) => {
              const val = e.target.value;
              setContent(val);
              setIsDirty(val !== initialContentRef.current);
            }}
            data-testid="gitignore-editor-textarea"
            placeholder="# Add patterns to ignore here..."
          />
        )}
      </div>

      <div className="vscode-status-bar" data-testid="gitignore-status-bar">
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
          <span>gitignore</span>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default GitignoreTab;
