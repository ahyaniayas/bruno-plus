import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconAlertTriangle, IconArrowBackUp, IconCloudDownload, IconGitMerge } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import ConfirmDialog from '../ConfirmDialog';
import { discardConflict, discardFiles, pullBranch, refreshRepo } from 'providers/ReduxStore/slices/git/actions';
import { formatGitError, parseConflictingFilesFromError, splitFilePath } from '../utils';

/**
 * Pull tab.
 *
 * Pulling uses fast-forward only (--ff-only) for safety, preventing automatic
 * merge commits when branches diverge. If conflicting changes block the pull,
 * the conflicting files are listed with options to discard changes per file or discard all.
 */
const PullTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState(null);
  const [confirmDiscardAll, setConfirmDiscardAll] = useState(false);
  const [rejectedFiles, setRejectedFiles] = useState([]);
  const [pullError, setPullError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

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
          strategy: '--ff-only'
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
          {currentBranch ? `${currentBranch} ← origin (Fast-forward only)` : 'No branch'}
        </div>

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
                  <span className="git-file-name">
                    <bdi>{name}</bdi>
                    {dir ? <span className="git-file-dir"> {dir}</span> : null}
                  </span>
                  <span className="git-file-actions" style={{ opacity: 1 }}>
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

        {hasConflict && (
          <div style={{ marginBottom: 10 }}>
            <Button
              size="sm"
              variant="outline"
              color="danger"
              fullWidth
              icon={<IconArrowBackUp size={13} strokeWidth={1.5} />}
              disabled={busy}
              onClick={() => setConfirmDiscardAll(true)}
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
            Pull from origin
          </Button>
        </div>

        {!remoteUrl && (
          <div className="git-commit-hint" style={{ marginTop: 8 }} data-testid="git-pull-no-remote">
            No remote configured — pull is unavailable. Add one in the Config tab to enable pull.
          </div>
        )}

        <div className="git-coming-soon" style={{ marginTop: 16 }} data-testid="git-conflict-coming-soon">
          <div className="git-coming-soon-title">
            <IconGitMerge size={13} strokeWidth={1.5} />
            Merge & Conflict Resolution
            <span className="git-coming-soon-badge">Coming soon</span>
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>
            Resolving conflicts by hand is not available yet. Planned:
          </div>
          <ul className="git-coming-soon-list">
            <li>Three-way merge editor (base / ours / theirs)</li>
            <li>Per-hunk conflict editor</li>
            <li>Advanced side-by-side diff viewer</li>
          </ul>
          <div className="git-coming-soon-tip" data-testid="git-conflict-external-tip">
            💡 <strong>External resolution:</strong> You can still resolve merge conflicts anytime using external tools such as VS Code, JetBrains, or your terminal Git merge tool, then commit the resolved files.
          </div>
        </div>
      </div>

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
            <strong>fast-forward only</strong>.
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
