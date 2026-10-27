import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconAlertTriangle, IconArrowBackUp, IconMinus, IconPlus } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import ConfirmDialog from '../ConfirmDialog';
import {
  commitChanges,
  discardFiles,
  getFileDiff,
  stageFiles,
  unstageFiles
} from 'providers/ReduxStore/slices/git/actions';
import DiffViewer from '../DiffViewer';
import { splitFilePath, statusLetter, statusClass } from '../utils';

const FileRow = ({ file, selected, onSelect, actions, status }) => {
  const { dir, name } = splitFilePath(file.path);

  return (
    <div
      className={`git-file-row ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      data-testid="git-file-row"
      title={file.path}
    >
      <span className={`git-file-status ${statusClass(status)}`}>{statusLetter(status)}</span>
      <span className="git-file-name">
        {name}
        {dir ? <span className="git-file-dir"> {dir}</span> : null}
      </span>
      <span className="git-file-actions">{actions}</span>
    </div>
  );
};

const ChangesTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [diff, setDiff] = useState('');
  const [diffLoading, setDiffLoading] = useState(false);
  const [discardTarget, setDiscardTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const { staged, unstaged, conflicted, tooManyFiles } = repo;
  const hasStaged = staged.length > 0;
  const canCommit = hasStaged && message.trim().length > 0 && !busy;

  // Drop the selection when the file disappears from the status after a mutation.
  useEffect(() => {
    if (!selected) return;
    const stillPresent = [...staged, ...unstaged].some((file) => file.path === selected.path);
    if (!stillPresent) {
      setSelected(null);
      setDiff('');
    }
  }, [staged, unstaged, selected]);

  const loadDiff = useCallback(
    async (file, isStaged) => {
      setSelected({ ...file, staged: isStaged });
      setDiffLoading(true);
      setDiff('');
      try {
        const result = await dispatch(getFileDiff(collectionPath, file.path, isStaged));
        setDiff(result || '');
      } catch (error) {
        toast.error(error?.message || 'Failed to read diff');
      } finally {
        setDiffLoading(false);
      }
    },
    [collectionPath, dispatch]
  );

  const handleStage = async (event, file) => {
    event.stopPropagation();
    setBusy(true);
    try {
      await dispatch(stageFiles(collectionUid, collectionPath, [file.path]));
    } catch (error) {
      toast.error(error?.message || 'Failed to stage file');
    } finally {
      setBusy(false);
    }
  };

  const handleUnstage = async (event, file) => {
    event.stopPropagation();
    setBusy(true);
    try {
      await dispatch(unstageFiles(collectionUid, collectionPath, [file.path]));
    } catch (error) {
      toast.error(error?.message || 'Failed to unstage file');
    } finally {
      setBusy(false);
    }
  };

  const handleStageAll = async () => {
    setBusy(true);
    try {
      await dispatch(stageFiles(collectionUid, collectionPath, unstaged.map((file) => file.path)));
    } catch (error) {
      toast.error(error?.message || 'Failed to stage files');
    } finally {
      setBusy(false);
    }
  };

  const handleDiscardConfirmed = async () => {
    const target = discardTarget;
    setDiscardTarget(null);
    if (!target) return;
    setBusy(true);
    try {
      await dispatch(discardFiles(collectionUid, collectionPath, [target.path]));
      toast.success('Changes discarded');
    } catch (error) {
      toast.error(error?.message || 'Failed to discard changes');
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!canCommit) return;
    setBusy(true);
    try {
      await dispatch(commitChanges(collectionUid, collectionPath, message));
      setMessage('');
      toast.success('Changes committed');
    } catch (error) {
      toast.error(error?.message || 'Failed to commit');
    } finally {
      setBusy(false);
    }
  };

  if (tooManyFiles) {
    return (
      <div className="git-empty">
        Too many changed files to display. Commit or discard changes outside Bruno, then refresh.
      </div>
    );
  }

  const nothingToShow = staged.length === 0 && unstaged.length === 0 && conflicted.length === 0;

  return (
    <div className="git-split">
      {repo.error ? <div className="git-error">{repo.error}</div> : null}

      <div className="git-file-groups">
        {conflicted.length > 0 && (
          <>
            <div className="git-group-title">
              <IconAlertTriangle size={12} strokeWidth={1.5} />
              Conflicts ({conflicted.length})
            </div>
            {conflicted.map((file) => (
              <FileRow
                key={`conflict-${file.path}`}
                file={file}
                status="conflicted"
                selected={selected?.path === file.path}
                onSelect={() => loadDiff(file, false)}
                actions={null}
              />
            ))}
          </>
        )}

        {staged.length > 0 && (
          <>
            <div className="git-group-title">
              Staged ({staged.length})
            </div>
            {staged.map((file) => (
              <FileRow
                key={`staged-${file.path}`}
                file={file}
                status={file.fileIndex || 'M'}
                selected={selected?.path === file.path && selected?.staged}
                onSelect={() => loadDiff(file, true)}
                actions={
                  (
                    <ActionIcon
                      label="Unstage"
                      onClick={(event) => handleUnstage(event, file)}
                      data-testid="git-unstage-btn"
                    >
                      <IconMinus size={13} strokeWidth={1.5} />
                    </ActionIcon>
                  )
                }
              />
            ))}
          </>
        )}

        {unstaged.length > 0 && (
          <>
            <div className="git-group-title">
              <span>Changes ({unstaged.length})</span>
              <span style={{ marginLeft: 'auto' }}>
                <ActionIcon label="Stage all" onClick={handleStageAll} data-testid="git-stage-all-btn">
                  <IconPlus size={13} strokeWidth={1.5} />
                </ActionIcon>
              </span>
            </div>
            {unstaged.map((file) => (
              <FileRow
                key={`unstaged-${file.path}`}
                file={file}
                status={file.working_dir || 'M'}
                selected={selected?.path === file.path && !selected?.staged}
                onSelect={() => loadDiff(file, false)}
                actions={
                  (
                    <>
                      <ActionIcon
                        label="Discard changes"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDiscardTarget(file);
                        }}
                        data-testid="git-discard-btn"
                      >
                        <IconArrowBackUp size={13} strokeWidth={1.5} />
                      </ActionIcon>
                      <ActionIcon
                        label="Stage"
                        onClick={(event) => handleStage(event, file)}
                        data-testid="git-stage-btn"
                      >
                        <IconPlus size={13} strokeWidth={1.5} />
                      </ActionIcon>
                    </>
                  )
                }
              />
            ))}
          </>
        )}

        {nothingToShow && <div className="git-empty">Working tree clean — nothing to commit.</div>}
      </div>

      {selected && (
        <div style={{ flex: '1 1 45%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {diffLoading ? <div className="git-spinner">Loading diff…</div> : <DiffViewer diff={diff} filePath={selected.path} />}
        </div>
      )}

      <div className="git-commit-box">
        <textarea
          className="git-commit-input"
          placeholder="Commit message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={busy}
          data-testid="git-commit-message"
        />
        <Button
          size="sm"
          fullWidth
          disabled={!canCommit}
          loading={busy}
          onClick={handleCommit}
          data-testid="git-commit-btn"
        >
          {hasStaged ? `Commit ${staged.length} file${staged.length === 1 ? '' : 's'}` : 'Commit'}
        </Button>
        {!hasStaged && <span className="git-commit-hint">Stage files to enable commit.</span>}
      </div>

      {discardTarget && (
        <ConfirmDialog
          title="Discard changes?"
          confirmText="Discard"
          confirmButtonColor="danger"
          onConfirm={handleDiscardConfirmed}
          onCancel={() => setDiscardTarget(null)}
        >
          <div>
            All uncommitted changes to <strong>{discardTarget.path}</strong> will be lost. This cannot be undone.
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default ChangesTab;
