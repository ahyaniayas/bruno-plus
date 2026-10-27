import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconAlertTriangle, IconArrowBackUp, IconCloudUpload, IconGitCommit, IconMinus, IconPlus } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import ConfirmDialog from '../ConfirmDialog';
import {
  commitChanges,
  discardFiles,
  getFileDiff,
  pushBranch,
  revertCommit,
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
        <bdi>{name}</bdi>
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
  const [revertTarget, setRevertTarget] = useState(null);
  const [revertMode, setRevertMode] = useState('undo');
  const [committing, setCommitting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [tabError, setTabError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isBusy = busy || committing || pushing;

  const { staged, unstaged, conflicted, tooManyFiles } = repo;
  const aheadCommits = repo.aheadCommits || [];
  const hasStaged = staged.length > 0;
  const canCommit = hasStaged && message.trim().length > 0 && !isBusy;

  // Push is displayed when there are local commits ahead of remote.
  const ahead = repo.ahead || 0;
  const hasRemote = !!repo.remoteUrl;
  const canShowPush = ahead > 0;
  const canPush = hasRemote && !!repo.currentBranch && ahead > 0 && !isBusy;
  const pushTitle = !hasRemote
    ? 'No remote configured. Add one in the Config tab to enable push.'
    : !repo.currentBranch
        ? 'No branch to push.'
        : `Push ${ahead} commit${ahead === 1 ? '' : 's'} to origin`;
  const pushBlockedReason = !hasRemote
    ? 'Configure a remote in the Config tab to push.'
    : !repo.currentBranch
        ? 'No branch to push.'
        : '';

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

  const handleUnstageAll = async () => {
    setBusy(true);
    try {
      await dispatch(unstageFiles(collectionUid, collectionPath, staged.map((file) => file.path)));
    } catch (error) {
      toast.error(error?.message || 'Failed to unstage files');
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

  const handleRevertConfirmed = async () => {
    const target = revertTarget;
    const mode = revertMode;
    setRevertTarget(null);
    if (!target) return;
    setBusy(true);
    setTabError(null);
    try {
      await dispatch(
        revertCommit(collectionUid, collectionPath, {
          commitHash: target.hash,
          mode
        })
      );
      if (mode === 'hard') {
        toast.success('Commit discarded');
      } else if (mode === 'revert') {
        toast.success('Commit reverted');
      } else {
        toast.success('Commit undone (changes kept in working tree)');
      }
    } catch (error) {
      setTabError(error?.message || 'Failed to revert commit');
      toast.error(error?.message || 'Failed to revert commit');
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!canCommit) return;
    setCommitting(true);
    setTabError(null);
    try {
      await dispatch(commitChanges(collectionUid, collectionPath, message));
      setMessage('');
      toast.success('Changes committed');
    } catch (error) {
      setTabError(error?.message || 'Failed to commit');
      toast.error(error?.message || 'Failed to commit');
    } finally {
      setCommitting(false);
    }
  };

  const handlePush = async () => {
    if (!canPush) return;
    setPushing(true);
    setTabError(null);
    try {
      await dispatch(pushBranch(collectionUid, collectionPath, { remoteBranch: repo.currentBranch }));
      toast.success(`Pushed ${repo.currentBranch} to origin`);
    } catch (error) {
      setTabError(error?.message || 'Failed to push');
      toast.error(error?.message || 'Failed to push');
    } finally {
      setPushing(false);
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
      {tabError ? <div className="git-error">{tabError}</div> : null}

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
              <span>Staged ({staged.length})</span>
              <span style={{ marginLeft: 'auto' }}>
                <ActionIcon
                  label="Unstage all"
                  onClick={handleUnstageAll}
                  data-testid="git-unstage-all-btn"
                >
                  <IconMinus size={13} strokeWidth={1.5} />
                </ActionIcon>
              </span>
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

        {aheadCommits.length > 0 && (
          <>
            <div className="git-group-title" data-testid="git-unpushed-commits-header">
              <IconGitCommit size={12} strokeWidth={2} />
              <span>Unpushed Commits ({aheadCommits.length})</span>
            </div>
            {aheadCommits.map((commit, index) => {
              const isHead = index === 0;
              const shortHash = commit.hash ? commit.hash.slice(0, 7) : '';
              return (
                <div className="git-commit-row" key={commit.hash || index} data-testid="git-unpushed-commit-row">
                  <span className="git-commit-icon" title={isHead ? 'Latest unpushed commit (HEAD)' : 'Unpushed commit'}>
                    <IconGitCommit size={14} strokeWidth={1.8} />
                  </span>
                  <div className="git-commit-info">
                    <div className="git-commit-msg" title={commit.message}>
                      {commit.message}
                    </div>
                    <div className="git-commit-meta">
                      <span className="git-commit-hash">{shortHash}</span>
                      {commit.author && <span>{commit.author}</span>}
                      {commit.time && <span>· {commit.time}</span>}
                    </div>
                  </div>
                  <div className="git-commit-actions">
                    <ActionIcon
                      label="Revert or undo this commit"
                      onClick={() => {
                        setRevertTarget(commit);
                        setRevertMode('undo');
                      }}
                      disabled={isBusy}
                      data-testid="git-revert-commit-btn"
                    >
                      <IconArrowBackUp size={13} strokeWidth={1.5} />
                    </ActionIcon>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {nothingToShow && aheadCommits.length === 0 && (
          <div className="git-empty">Working tree clean — nothing to commit.</div>
        )}

        {nothingToShow && aheadCommits.length > 0 && (
          <div className="git-empty" style={{ padding: '12px 10px' }}>
            Working tree clean — ready to push.
          </div>
        )}
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
          disabled={isBusy}
          data-testid="git-commit-message"
        />
        <div className="git-commit-actions">
          <Button
            size="sm"
            fullWidth
            disabled={!canCommit}
            loading={committing}
            onClick={handleCommit}
            data-testid="git-commit-btn"
          >
            {hasStaged ? `Commit ${staged.length} file${staged.length === 1 ? '' : 's'}` : 'Commit'}
          </Button>
          {canShowPush && (
            <Button
              size="sm"
              variant="outline"
              color="secondary"
              fullWidth
              icon={<IconCloudUpload size={13} strokeWidth={1.5} />}
              disabled={!canPush}
              loading={pushing}
              onClick={handlePush}
              title={pushTitle}
              data-testid="git-push-btn"
            >
              Push{ahead > 0 ? ` (${ahead})` : ''}
            </Button>
          )}
        </div>
        {!hasStaged && <span className="git-commit-hint">Stage files to enable commit.</span>}
        {canShowPush && !canPush && pushBlockedReason && (
          <span className="git-commit-hint">{pushBlockedReason}</span>
        )}
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

      {revertTarget && (
        <ConfirmDialog
          title="Revert unpushed commit?"
          confirmText={revertMode === 'hard' ? 'Discard commit' : revertMode === 'revert' ? 'Create revert commit' : 'Undo commit'}
          confirmButtonColor={revertMode === 'hard' ? 'danger' : 'primary'}
          onConfirm={handleRevertConfirmed}
          onCancel={() => setRevertTarget(null)}
        >
          <div>
            <div style={{ marginBottom: 10 }}>
              Revert unpushed commit <code>{revertTarget.hash?.slice(0, 7)}</code>:
              <div style={{ fontWeight: 600, marginTop: 4, wordBreak: 'break-word' }}>
                "{revertTarget.message}"
              </div>
            </div>

            <div className="git-revert-options" data-testid="git-revert-options">
              <label
                className={`git-revert-option ${revertMode === 'undo' ? 'selected' : ''}`}
                onClick={() => setRevertMode('undo')}
              >
                <input
                  type="radio"
                  name="revertMode"
                  value="undo"
                  checked={revertMode === 'undo'}
                  onChange={() => setRevertMode('undo')}
                  data-testid="git-revert-mode-undo"
                />
                <div className="git-revert-option-text">
                  <div className="git-revert-option-title">Undo commit (Keep changes)</div>
                  <div className="git-revert-option-desc">
                    Undoes this commit and moves modified files back to your Changes list so you can edit or re-commit them.
                  </div>
                </div>
              </label>

              <label
                className={`git-revert-option ${revertMode === 'revert' ? 'selected' : ''}`}
                onClick={() => setRevertMode('revert')}
              >
                <input
                  type="radio"
                  name="revertMode"
                  value="revert"
                  checked={revertMode === 'revert'}
                  onChange={() => setRevertMode('revert')}
                  data-testid="git-revert-mode-revert"
                />
                <div className="git-revert-option-text">
                  <div className="git-revert-option-title">Create revert commit</div>
                  <div className="git-revert-option-desc">
                    Creates a new commit on top of HEAD that inverts this commit's changes.
                  </div>
                </div>
              </label>

              <label
                className={`git-revert-option ${revertMode === 'hard' ? 'selected' : ''}`}
                onClick={() => setRevertMode('hard')}
              >
                <input
                  type="radio"
                  name="revertMode"
                  value="hard"
                  checked={revertMode === 'hard'}
                  onChange={() => setRevertMode('hard')}
                  data-testid="git-revert-mode-hard"
                />
                <div className="git-revert-option-text">
                  <div className="git-revert-option-title">Discard commit completely</div>
                  <div className="git-revert-option-desc">
                    Deletes this commit and discards all changes permanently. This cannot be undone.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default ChangesTab;
