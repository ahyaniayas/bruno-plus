import React, { useContext, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconDeviceFloppy,
  IconGitMerge
} from '@tabler/icons';
import Button from 'ui/Button';
import Modal from 'components/Modal';
import { ThemeContext } from 'providers/Theme';
import { getFileContent, resolveAndStageFile } from 'providers/ReduxStore/slices/git/actions';
import { parseConflicts, resolveAllConflictsInText, resolveConflictInText } from './parser';
import StyledWrapper from './StyledWrapper';

let CodeMirror;
const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const SERVER_RENDERED = typeof window === 'undefined' || global['PREVENT_CODEMIRROR_RENDER'] === true || IS_TEST;

if (!SERVER_RENDERED) {
  try {
    CodeMirror = require('codemirror');
    try {
      require('codemirror/mode/javascript/javascript');
      require('codemirror/mode/yaml/yaml');
      require('codemirror/mode/xml/xml');
      require('codemirror/mode/markdown/markdown');
    } catch (_) {}
  } catch (_) {
    CodeMirror = null;
  }
}

const getModeForFile = (filePath = '') => {
  if (filePath.endsWith('.json') || filePath.endsWith('.bru')) return 'application/json';
  if (filePath.endsWith('.js') || filePath.endsWith('.ts')) return 'javascript';
  if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) return 'yaml';
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('.html') || filePath.endsWith('.xml')) return 'xml';
  return 'default';
};

const ConflictResolverModal = ({
  collectionUid,
  collectionPath,
  filePath,
  onClose,
  onResolved
}) => {
  const dispatch = useDispatch();
  const themeContext = useContext(ThemeContext);
  const isDark = themeContext ? themeContext.displayedTheme === 'dark' : true;

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [activeConflictIndex, setActiveConflictIndex] = useState(0);

  const editorContainerRef = useRef(null);
  const cmRef = useRef(null);
  const lineWidgetsRef = useRef([]);
  const contentRef = useRef('');

  // Load conflicted file content
  useEffect(() => {
    let active = true;
    dispatch(getFileContent(collectionPath, filePath))
      .then((fileText) => {
        if (!active) return;
        const text = fileText || '';
        setContent(text);
        contentRef.current = text;
        const parsed = parseConflicts(text);
        setConflicts(parsed);
      })
      .catch((err) => {
        if (active) toast.error(err?.message || `Failed to read file ${filePath}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [collectionPath, filePath, dispatch]);

  // Clean up widgets & line classes in CodeMirror
  const clearCodeMirrorDecorations = (cm) => {
    if (!cm) return;
    lineWidgetsRef.current.forEach((w) => {
      try {
        w.clear();
      } catch (_) {}
    });
    lineWidgetsRef.current = [];

    const lineCount = cm.lineCount();
    for (let i = 0; i < lineCount; i++) {
      cm.removeLineClass(i, 'background', 'git-conflict-current-line');
      cm.removeLineClass(i, 'background', 'git-conflict-incoming-line');
      cm.removeLineClass(i, 'background', 'git-conflict-marker-start');
      cm.removeLineClass(i, 'background', 'git-conflict-marker-sep');
      cm.removeLineClass(i, 'background', 'git-conflict-marker-end');
    }
  };

  // Attach VS Code CodeLens widgets and line highlights
  const decorateConflicts = (cm, parsedConflicts) => {
    if (!cm) return;
    clearCodeMirrorDecorations(cm);

    parsedConflicts.forEach((conflict) => {
      const { startLine, separatorLine, endLine } = conflict;

      // Add line backgrounds
      cm.addLineClass(startLine, 'background', 'git-conflict-marker-start');
      for (let l = startLine + 1; l < separatorLine; l++) {
        cm.addLineClass(l, 'background', 'git-conflict-current-line');
      }
      cm.addLineClass(separatorLine, 'background', 'git-conflict-marker-sep');
      for (let l = separatorLine + 1; l < endLine; l++) {
        cm.addLineClass(l, 'background', 'git-conflict-incoming-line');
      }
      cm.addLineClass(endLine, 'background', 'git-conflict-marker-end');

      // Create CodeLens Widget bar
      const widgetNode = document.createElement('div');
      widgetNode.className = 'git-codelens-toolbar';

      const btnCurrent = document.createElement('button');
      btnCurrent.type = 'button';
      btnCurrent.className = 'git-codelens-btn current';
      btnCurrent.textContent = `Accept Current Change (${conflict.currentLabel || 'HEAD'})`;
      btnCurrent.onclick = () => handleResolveConflict(conflict, 'current');

      const divider1 = document.createElement('span');
      divider1.className = 'git-codelens-divider';
      divider1.textContent = '|';

      const btnIncoming = document.createElement('button');
      btnIncoming.type = 'button';
      btnIncoming.className = 'git-codelens-btn incoming';
      btnIncoming.textContent = `Accept Incoming Change (${conflict.incomingLabel || 'Remote'})`;
      btnIncoming.onclick = () => handleResolveConflict(conflict, 'incoming');

      const divider2 = document.createElement('span');
      divider2.className = 'git-codelens-divider';
      divider2.textContent = '|';

      const btnBoth = document.createElement('button');
      btnBoth.type = 'button';
      btnBoth.className = 'git-codelens-btn both';
      btnBoth.textContent = 'Accept Both Changes';
      btnBoth.onclick = () => handleResolveConflict(conflict, 'both');

      widgetNode.appendChild(btnCurrent);
      widgetNode.appendChild(divider1);
      widgetNode.appendChild(btnIncoming);
      widgetNode.appendChild(divider2);
      widgetNode.appendChild(btnBoth);

      const widget = cm.addLineWidget(startLine, widgetNode, {
        above: true,
        coverGutter: false,
        noHScroll: true
      });
      lineWidgetsRef.current.push(widget);
    });
  };

  // Initialize CodeMirror editor
  useEffect(() => {
    if (loading || !editorContainerRef.current || !CodeMirror) return;

    if (!cmRef.current) {
      const cm = CodeMirror(editorContainerRef.current, {
        value: contentRef.current,
        lineNumbers: true,
        lineWrapping: true,
        mode: getModeForFile(filePath),
        theme: isDark ? 'monokai' : 'default',
        tabSize: 2
      });

      cmRef.current = cm;

      cm.on('change', () => {
        const val = cm.getValue();
        contentRef.current = val;
        setContent(val);
        const nextConflicts = parseConflicts(val);
        setConflicts(nextConflicts);
        decorateConflicts(cm, nextConflicts);
      });

      decorateConflicts(cm, parseConflicts(contentRef.current));
    } else {
      const cm = cmRef.current;
      cm.setOption('theme', isDark ? 'monokai' : 'default');
    }

    return () => {
      if (cmRef.current) {
        clearCodeMirrorDecorations(cmRef.current);
      }
    };
  }, [loading, isDark, filePath]);

  // Navigate to conflict in CodeMirror
  const scrollToConflict = (idx) => {
    if (idx < 0 || idx >= conflicts.length) return;
    setActiveConflictIndex(idx);
    const target = conflicts[idx];
    if (cmRef.current) {
      cmRef.current.scrollIntoView({ line: target.startLine, ch: 0 }, 100);
      cmRef.current.setCursor({ line: target.startLine, ch: 0 });
    }
  };

  const handleResolveConflict = (conflict, resolution) => {
    const updated = resolveConflictInText(contentRef.current, conflict, resolution);
    contentRef.current = updated;
    setContent(updated);

    if (cmRef.current) {
      cmRef.current.setValue(updated);
    } else {
      const next = parseConflicts(updated);
      setConflicts(next);
    }
  };

  const handleResolveAll = (resolution) => {
    const updated = resolveAllConflictsInText(contentRef.current, resolution);
    contentRef.current = updated;
    setContent(updated);

    if (cmRef.current) {
      cmRef.current.setValue(updated);
    } else {
      const next = parseConflicts(updated);
      setConflicts(next);
    }
    toast.success(`Resolved all conflicts (${resolution})`);
  };

  const handleSaveAndStage = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await dispatch(resolveAndStageFile(collectionUid, collectionPath, filePath, contentRef.current));
      toast.success(`Resolved & staged ${filePath}`);
      if (onResolved) onResolved(filePath);
      onClose();
    } catch (error) {
      toast.error(error?.message || `Failed to save ${filePath}`);
    } finally {
      setSaving(false);
    }
  };

  const conflictCount = conflicts.length;
  const isResolved = conflictCount === 0;

  return (
    <Modal
      size="xl"
      title={`Resolve Conflict: ${filePath}`}
      handleCancel={onClose}
      hideFooter
    >
      <StyledWrapper data-testid="git-conflict-resolver-modal">
        {/* Top Control Toolbar */}
        <div className="resolver-toolbar">
          <div className="resolver-status">
            <span
              className={`resolver-badge ${isResolved ? 'resolved' : 'unresolved'}`}
              data-testid="git-conflict-status-badge"
            >
              {isResolved ? (
                <>
                  <IconCheck size={12} strokeWidth={2.5} /> All conflicts resolved
                </>
              ) : (
                <>
                  <IconAlertTriangle size={12} strokeWidth={2} />
                  {conflictCount} conflict{conflictCount === 1 ? '' : 's'} remaining
                </>
              )}
            </span>

            {conflictCount > 0 && (
              <span style={{ color: 'var(--color-subtext, #888)' }}>
                Conflict {activeConflictIndex + 1} of {conflictCount}
              </span>
            )}
          </div>

          <div className="resolver-controls">
            {conflictCount > 0 && (
              <>
                <Button
                  size="xs"
                  variant="outline"
                  icon={<IconArrowLeft size={12} />}
                  disabled={activeConflictIndex <= 0}
                  onClick={() => scrollToConflict(activeConflictIndex - 1)}
                  data-testid="git-conflict-prev-btn"
                >
                  Prev
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  icon={<IconArrowRight size={12} />}
                  disabled={activeConflictIndex >= conflictCount - 1}
                  onClick={() => scrollToConflict(activeConflictIndex + 1)}
                  data-testid="git-conflict-next-btn"
                >
                  Next
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleResolveAll('current')}
                  data-testid="git-conflict-accept-all-current-btn"
                >
                  Accept All Current
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleResolveAll('incoming')}
                  data-testid="git-conflict-accept-all-incoming-btn"
                >
                  Accept All Incoming
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Editor Area */}
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>Loading file content...</div>
        ) : CodeMirror ? (
          <div className="resolver-editor-container" ref={editorContainerRef} />
        ) : (
          /* Test / SSR Fallback View */
          <div className="resolver-fallback-container">
            {conflictCount > 0 && (
              <div className="resolver-fallback-conflicts" data-testid="git-conflict-fallback-list">
                {conflicts.map((c, i) => (
                  <div key={c.id} className="resolver-fallback-row">
                    <span>
                      Conflict #{i + 1} (lines {c.startLine + 1} - {c.endLine + 1})
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleResolveConflict(c, 'current')}
                        data-testid={`git-conflict-resolve-current-btn-${c.id}`}
                      >
                        Accept Current
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleResolveConflict(c, 'incoming')}
                        data-testid={`git-conflict-resolve-incoming-btn-${c.id}`}
                      >
                        Accept Incoming
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleResolveConflict(c, 'both')}
                        data-testid={`git-conflict-resolve-both-btn-${c.id}`}
                      >
                        Accept Both
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <textarea
              className="resolver-textarea"
              value={content}
              data-testid="git-conflict-editor-textarea"
              onChange={(e) => {
                const val = e.target.value;
                contentRef.current = val;
                setContent(val);
                setConflicts(parseConflicts(val));
              }}
              rows={18}
            />
          </div>
        )}

        {/* Bottom Actions */}
        <div className="resolver-footer">
          <div className="resolver-footer-hint">
            {isResolved ? (
              <span style={{ color: '#2ea44f', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconCheck size={14} /> All markers cleared. Click Save to stage this file.
              </span>
            ) : (
              <span>
                Select an action above each conflict or edit the text directly. All conflict markers must be removed.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              color={isResolved ? 'primary' : 'secondary'}
              icon={<IconDeviceFloppy size={14} />}
              loading={saving}
              onClick={handleSaveAndStage}
              data-testid="git-conflict-save-btn"
            >
              {isResolved ? 'Save & Mark as Resolved' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default ConflictResolverModal;
