import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconCheck,
  IconCloudDownload,
  IconEdit,
  IconGitMerge
} from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import ConfirmDialog from '../ConfirmDialog';
import ConflictResolverModal from '../ConflictResolverModal';
import {
  abortMergeAction,
  continueMergeAction,
  discardConflict,
  discardFiles,
  pullBranch,
  refreshRepo
} from 'providers/ReduxStore/slices/git/actions';
import { formatGitError, parseConflictingFilesFromError, splitFilePath } from '../utils';

/**
 * Pull tab.
 *
 * Supports both fast-forward only (--ff-only, default) and merge (--no-rebase).
 * When merge conflicts occur, users can resolve them in a VS Code-style
 * inline merge conflict editor or abort the merge.
 */
const PullTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const [pullStrategy, setPullStrategy] = useState('--ff-only');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState(null);
  const [confirmDiscardAll, setConfirmDiscardAll] = useState(false);
  const [confirmAbortMerge, setConfirmAbortMerge] = useState(false);
  const [rejectedFiles, setRejectedFiles] = useState([]);
  const [pullError, setPullError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [resolvingFile, setResolvingFile] = useState(null);
  const [mergeCommitMessage, setMergeCommitMessage] = useState('');

  const { remoteUrl, currentBranch, staged, unstaged, conflicted, mergeInProgress } = repo;
  const hasLocalChanges = staged.length > 0 || unstaged.length > 0;
  const canPull = !!remoteUrl && !!currentBranch && !busy;

  // Combine conflicted files from repo status with any parsed from git pull error
  const allConflictPaths = Array.from(
    new Set([
      ...conflicted.map((f) => f.path),
      ...rejectedFiles
    ])
  );
  const hasConflict = allConflictPaths.length > 0 || mergeInProgress;

  const handlePull = async () => {
    setConfirmOpen(false);
    setBusy(true);
    setRejectedFiles([]);
    setPullError(null);
    try {
      await dispatch(
        pullBranch(collectionUid, collectionPath, {
          remoteBranch: currentBranch,
          strategy: pullStrategy
        })
      );
      toast.success(`Pulled ${currentBranch} from origin`);
      setPullError(null);
    } catch (error) {
      const parsed = parseConflictingFilesFromError(error);
      if (parsed.length > 0) {
        setRejectedFiles(parsed);
      }
      const friendlyMsg = formatGitError(error, 'Failed to pull');
      setPullError(friendlyMsg);
      toast.error(friendlyMsg);
      await dispatch(refreshRepo(collectionUid, collectionPath)).catch(() => null);
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteMerge = async () => {
    setBusy(true);
    const msg = mergeCommitMessage.trim() || `Merge branch '${currentBranch}' of ${remoteUrl || 'origin'}`;
    try {
      await dispatch(continueMergeAction(collectionUid, collectionPath, msg));
      toast.success('Merge completed successfully');
      setMergeCommitMessage('');
      setRejectedFiles([]);
      setPullError(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to complete merge');
    } finally {
      setBusy(false);
    }
  };

  const handleAbortMergeConfirmed = async () => {
    setConfirmAbortMerge(false);
    setBusy(true);
    try {
      await dispatch(discardConflict(collectionUid, collectionPath));
      setRejectedFiles([]);
      setPullError(null);
      toast.success('Merge aborted successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to abort merge');
    } finally {
      setBusy(false);
    }
  };

  const handleDiscardTargetConfirmed = async () => {
    const target = discardTarget;
    setDiscardTarget(null);
    if (!target) return;
    setBusy(true);
    try {
      await dispatch(discardFiles(collectionUid, collectionPath, [target.path]));
      setRejectedFiles((prev) => {
        const next = prev.filter((p) => p !== target.path);
        if (next.length === 0) setPullError(null);
        return next;
      });
      toast.success(`Discarded changes to ${target.path}`);
    } catch (error) {
      toast.error(error?.message || 'Failed to discard changes');
    } finally {
      setBusy(false);
    }
  };

  const handleDiscardAllConfirmed = async () => {
    setConfirmDiscardAll(false);
    setBusy(true);
    try {
      if (mergeInProgress) {
        await dispatch(discardConflict(collectionUid, collectionPath));
      } else {
        const pathsToDiscard = allConflictPaths.length > 0
          ? allConflictPaths
          : [...staged, ...unstaged].map((f) => f.path);
        if (pathsToDiscard.length > 0) {
          await dispatch(discardFiles(collectionUid, collectionPath, pathsToDiscard));
        } else {
          await dispatch(discardConflict(collectionUid, collectionPath));
        }
      }
      setRejectedFiles([]);
      setPullError(null);
      toast.success('Local changes discarded');
    } catch (error) {
      toast.error(error?.message || 'Failed to discard changes');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="git-split">
      <div className="git-section-title">Pull from origin</div>

      <div className="git-scroll" style={{ padding: '8px 10px' }}>
        <div className="git-row-sub" style={{ marginBottom: 10 }}>
          {currentBranch ? `${currentBranch} ← origin` : 'No branch'}
        </div>

        {/* Radio Button Strategy Selector: Fast-forward only (default) vs Merge */}
        {!mergeInProgress && (
          <div
            className="git-strategy-box"
            style={{
              padding: '8px 10px',
              marginBottom: 12,
              borderRadius: 6,
              background: 'var(--color-surface, rgba(120, 120, 120, 0.08))',
              border: '1px solid var(--color-border, rgba(120, 120, 120, 0.2))'
            }}
            data-testid="git-pull-strategy-container"
          >
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
              Pull Strategy:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label
                style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: 'pointer', fontSize: 12 }}
                data-testid="git-strategy-ff-label"
              >
                <input
                  type="radio"
                  name="pull-strategy"
                  value="--ff-only"
                  checked={pullStrategy === '--ff-only'}
                  onChange={() => setPullStrategy('--ff-only')}
                  data-testid="git-strategy-ff-radio"
                  style={{ marginTop: 2, cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>Fast-forward only</div>
                  <div style={{ fontSize: 11, color: 'var(--color-subtext, #888)' }}>
                    Only pulls if branch can be fast-forwarded. Prevents merge commits.
                  </div>
                </div>
              </label>

              <label
                style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: 'pointer', fontSize: 12 }}
                data-testid="git-strategy-merge-label"
              >
                <input
                  type="radio"
                  name="pull-strategy"
                  value="--no-rebase"
                  checked={pullStrategy === '--no-rebase'}
                  onChange={() => setPullStrategy('--no-rebase')}
                  data-testid="git-strategy-merge-radio"
                  style={{ marginTop: 2, cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 500 }}>Merge (--no-rebase)</div>
                  <div style={{ fontSize: 11, color: 'var(--color-subtext, #888)' }}>
                    Merges diverged commits. Enables resolving conflicts if any occur.
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Conflicts / Pull Error Banner */}
        {(hasConflict || pullError) && (
          <div className="git-conflict-banner" data-testid="git-pull-conflict-banner">
            <div className="git-conflict-banner-header">
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconAlertTriangle size={13} strokeWidth={1.5} />
                {hasConflict
                  ? (mergeInProgress ? 'Merge in progress' : 'Conflicts detected')
                  : 'Pull failed'}
              </div>
              {pullError && (
                <button
                  type="button"
                  className="git-error-details-btn"
                  onClick={() => setShowDetails((prev) => !prev)}
                  data-testid="git-error-details-btn"
                >
                  {showDetails ? 'Hide details' : 'Show details'}
                </button>
              )}
            </div>

            <div>
              {hasConflict
                ? (allConflictPaths.length > 0
                    ? `${allConflictPaths.length} file${allConflictPaths.length === 1 ? '' : 's'} conflicted with incoming changes.`
                    : 'Local changes conflict with incoming commits.')
                : (showDetails
                    ? null
                    : (pullError.length > 90 ? `${pullError.slice(0, 90)}...` : pullError))}
            </div>

            {showDetails && pullError && (
              <div className="git-error-details" data-testid="git-error-details-text">
                {pullError}
              </div>
            )}
          </div>
        )}

        {/* Conflicted Files List */}
        {hasConflict && allConflictPaths.length > 0 && (
          <div className="git-file-groups" style={{ maxHeight: 220, marginBottom: 10 }}>
            <div
              className="git-group-title"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>Conflicted files ({allConflictPaths.length})</span>
              <Button
                size="xs"
                variant="outline"
                color="danger"
                disabled={busy}
                onClick={() => setConfirmDiscardAll(true)}
                data-testid="git-conflict-discard-all-btn"
              >
                Discard all
              </Button>
            </div>

            {allConflictPaths.map((filePath) => {
              const { dir, name } = splitFilePath(filePath);
              return (
                <div className="git-file-row" key={filePath} data-testid="git-conflict-row" title={filePath}>
                  <span className="git-file-status conflicted">!</span>
                  <span
                    className="git-file-name"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setResolvingFile(filePath)}
                    title="Click to resolve in editor"
                  >
                    <bdi>{name}</bdi>
                    {dir ? <span className="git-file-dir"> {dir}</span> : null}
                  </span>
                  <span className="git-file-actions" style={{ opacity: 1, display: 'flex', gap: 4 }}>
                    <Button
                      size="xs"
                      variant="outline"
                      color="primary"
                      icon={<IconEdit size={12} />}
                      onClick={() => setResolvingFile(filePath)}
                      data-testid={`git-resolve-btn-${filePath}`}
                    >
                      Resolve
                    </Button>
                    <ActionIcon
                      label="Discard changes"
                      onClick={() => setDiscardTarget({ path: filePath })}
                      data-testid="git-conflict-discard-file-btn"
                    >
                      <IconArrowBackUp size={13} strokeWidth={1.5} />
                    </ActionIcon>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* When Merge is in progress and all conflicts are resolved: ready to complete merge! */}
        {mergeInProgress && allConflictPaths.length === 0 && (
          <div
            style={{
              padding: 10,
              marginBottom: 12,
              borderRadius: 6,
              background: 'rgba(46, 160, 67, 0.1)',
              border: '1px solid rgba(46, 160, 67, 0.3)'
            }}
            data-testid="git-merge-ready-box"
          >
            <div style={{ fontWeight: 600, color: '#2ea44f', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <IconCheck size={14} strokeWidth={2.5} />
              All conflicts resolved!
            </div>
            <div style={{ fontSize: 11, marginBottom: 8, color: 'var(--color-subtext, #888)' }}>
              All conflicted files have been resolved and staged. Commit to complete the merge.
            </div>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid var(--color-border, #ccc)',
                background: 'var(--color-surface, #fff)',
                color: 'var(--color-text, #000)',
                marginBottom: 8
              }}
              placeholder={`Merge branch '${currentBranch}'`}
              value={mergeCommitMessage}
              onChange={(e) => setMergeCommitMessage(e.target.value)}
              data-testid="git-merge-commit-message-input"
            />
            <Button
              size="sm"
              color="primary"
              fullWidth
              icon={<IconGitMerge size={14} />}
              loading={busy}
              onClick={handleCompleteMerge}
              data-testid="git-complete-merge-btn"
            >
              Complete Merge
            </Button>
          </div>
        )}

        {/* Discard / Abort Merge Button */}
        {hasConflict && (
          <div style={{ marginBottom: 10 }}>
            <Button
              size="sm"
              variant="outline"
              color="danger"
              fullWidth
              icon={<IconArrowBackUp size={13} strokeWidth={1.5} />}
              disabled={busy}
              onClick={() => {
                if (mergeInProgress) {
                  setConfirmAbortMerge(true);
                } else {
                  setConfirmDiscardAll(true);
                }
              }}
              data-testid="git-conflict-discard-btn"
            >
              {mergeInProgress ? 'Abort merge' : 'Discard all local changes'}
            </Button>
          </div>
        )}

        {hasLocalChanges && !hasConflict && (
          <div className="git-commit-hint" style={{ marginTop: 8 }} data-testid="git-pull-local-changes">
            You have uncommitted changes. Fast-forward will be rejected if they conflict with incoming changes.
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <Button
            size="sm"
            fullWidth
            icon={<IconCloudDownload size={13} strokeWidth={1.5} />}
            disabled={!canPull}
            loading={busy}
            onClick={() => setConfirmOpen(true)}
            data-testid="git-pull-btn"
          >
            {pullStrategy === '--ff-only' ? 'Pull from origin (Fast-forward)' : 'Pull from origin (Merge)'}
          </Button>
        </div>

        {!remoteUrl && (
          <div className="git-commit-hint" style={{ marginTop: 8 }} data-testid="git-pull-no-remote">
            No remote configured — pull is unavailable. Add one in the Config tab to enable pull.
          </div>
        )}

        {/* Information & Pull Strategies Guide */}
        <div className="git-coming-soon" style={{ marginTop: 16 }} data-testid="git-conflict-coming-soon">
          <div className="git-coming-soon-title">
            <IconGitMerge size={13} strokeWidth={1.5} />
            Git Pull Strategies & Conflict Resolution
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
            Understanding pull strategies:
          </div>
          <ul className="git-coming-soon-list" style={{ marginBottom: 10 }}>
            <li>
              <strong>Fast-forward only (<code>--ff-only</code>):</strong> Fast-forwards your branch to the remote commit without creating a merge commit. This only works if your local branch has not diverged (no local commits ahead). If it has diverged, the pull is safely aborted.
            </li>
            <li>
              <strong>Merge (<code>--no-rebase</code>):</strong> Combines changes from the remote branch into your local branch. If the branch has diverged, it creates a new merge commit. If both local and remote changed the same lines, a merge conflict occurs and needs resolution.
            </li>
            <li>
              <strong>Built-in Resolver:</strong> When conflicts occur, click <strong>Resolve</strong> on any conflicted file to open the interactive VS Code-style editor (with <em>Accept Current</em>, <em>Accept Incoming</em>, or <em>Accept Both</em> changes).
            </li>
          </ul>
          <div className="git-coming-soon-tip" data-testid="git-conflict-external-tip">
            💡 <strong>External resolution:</strong> You can still resolve merge conflicts anytime using external tools such as VS Code, JetBrains, or your terminal Git merge tool, then commit or complete the merge.
          </div>
        </div>
      </div>

      {/* Conflict Resolver Modal */}
      {resolvingFile && (
        <ConflictResolverModal
          collectionUid={collectionUid}
          collectionPath={collectionPath}
          filePath={resolvingFile}
          onClose={() => setResolvingFile(null)}
          onResolved={() => {
            dispatch(refreshRepo(collectionUid, collectionPath));
          }}
        />
      )}

      {/* Confirmation Dialogs */}
      {confirmOpen && (
        <ConfirmDialog
          title="Pull from origin?"
          confirmText="Pull"
          confirmButtonColor="primary"
          onConfirm={handlePull}
          onCancel={() => setConfirmOpen(false)}
        >
          <div>
            Fetch and pull <strong>{currentBranch}</strong> from <strong>origin</strong> using{' '}
            <strong>{pullStrategy === '--ff-only' ? 'fast-forward only' : 'merge'}</strong>.
          </div>
        </ConfirmDialog>
      )}

      {confirmAbortMerge && (
        <ConfirmDialog
          title="Abort merge?"
          confirmText="Abort merge"
          confirmButtonColor="danger"
          onConfirm={handleAbortMergeConfirmed}
          onCancel={() => setConfirmAbortMerge(false)}
        >
          <div>
            The current merge will be aborted and your working tree returned to the state before the merge started.
          </div>
        </ConfirmDialog>
      )}

      {discardTarget && (
        <ConfirmDialog
          title="Discard changes?"
          confirmText="Discard"
          confirmButtonColor="danger"
          onConfirm={handleDiscardTargetConfirmed}
          onCancel={() => setDiscardTarget(null)}
        >
          <div>
            All uncommitted changes to <strong>{discardTarget.path}</strong> will be lost. This cannot be undone.
          </div>
        </ConfirmDialog>
      )}

      {confirmDiscardAll && (
        <ConfirmDialog
          title={mergeInProgress ? 'Abort merge?' : 'Discard all local changes?'}
          confirmText={mergeInProgress ? 'Abort merge' : 'Discard all'}
          confirmButtonColor="danger"
          onConfirm={handleDiscardAllConfirmed}
          onCancel={() => setConfirmDiscardAll(false)}
        >
          <div>
            {mergeInProgress
              ? 'The merge will be aborted and your working tree returned to the state before it started.'
              : 'All conflicting local changes will be discarded and reset to the last commit.'}{' '}
            This cannot be undone.
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default PullTab;
