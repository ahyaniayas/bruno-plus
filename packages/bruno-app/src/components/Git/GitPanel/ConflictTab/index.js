import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconAlertTriangle, IconArrowBackUp, IconCloudDownload, IconGitMerge } from '@tabler/icons';
import Button from 'ui/Button';
import ConfirmDialog from '../ConfirmDialog';
import { discardConflict, pullBranch } from 'providers/ReduxStore/slices/git/actions';
import { splitFilePath } from '../utils';

/**
 * Conflict tab.
 *
 * The simple resolution paths are wired up: throw away the local side
 * (abort the merge / reset to HEAD) or pull the remote again. Composing the
 * merged content by hand needs a three-way merge editor, which is not built
 * yet — that part is presented as Coming Soon rather than half-implemented.
 */
const ConflictTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmPull, setConfirmPull] = useState(false);

  const { conflicted, mergeInProgress, remoteUrl, currentBranch } = repo;
  const hasConflict = conflicted.length > 0 || mergeInProgress;

  const handleDiscard = async () => {
    setConfirmDiscard(false);
    setBusy(true);
    try {
      const result = await dispatch(discardConflict(collectionUid, collectionPath));
      toast.success(result?.action === 'aborted-merge' ? 'Merge aborted' : 'Local changes discarded');
    } catch (error) {
      toast.error(error?.message || 'Failed to discard changes');
    } finally {
      setBusy(false);
    }
  };

  const handlePull = async () => {
    setConfirmPull(false);
    setBusy(true);
    try {
      await dispatch(
        pullBranch(collectionUid, collectionPath, { remoteBranch: currentBranch || undefined, strategy: '--ff-only' })
      );
      toast.success('Pulled from remote');
    } catch (error) {
      // A diverged branch cannot fast-forward. Offer the merge path instead of
      // silently rewriting history with a reset.
      toast.error(error?.message || 'Failed to pull');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="git-split">
      {repo.error ? <div className="git-error">{repo.error}</div> : null}

      {hasConflict ? (
        <>
          <div className="git-conflict-banner">
            <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconAlertTriangle size={13} strokeWidth={1.5} />
              {mergeInProgress ? 'Merge in progress' : 'Conflicts detected'}
            </div>
            {conflicted.length} file{conflicted.length === 1 ? '' : 's'} could not be merged automatically.
          </div>

          <div className="git-file-groups">
            <div className="git-group-title">Conflicted files ({conflicted.length})</div>
            {conflicted.map((file) => {
              const { dir, name } = splitFilePath(file.path);
              return (
                <div className="git-file-row" key={file.path} data-testid="git-conflict-row" title={file.path}>
                  <span className="git-file-status conflicted">!</span>
                  <span className="git-file-name">
                    {name}
                    {dir ? <span className="git-file-dir"> {dir}</span> : null}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="git-conflict-actions">
            <Button
              size="sm"
              variant="outline"
              color="secondary"
              fullWidth
              icon={<IconArrowBackUp size={13} strokeWidth={1.5} />}
              disabled={busy}
              onClick={() => setConfirmDiscard(true)}
              data-testid="git-conflict-discard-btn"
            >
              Discard local
            </Button>
            <Button
              size="sm"
              variant="outline"
              color="secondary"
              fullWidth
              icon={<IconCloudDownload size={13} strokeWidth={1.5} />}
              disabled={busy || !remoteUrl}
              onClick={() => setConfirmPull(true)}
              data-testid="git-conflict-pull-btn"
            >
              Pull
            </Button>
          </div>
          {!remoteUrl && <div className="git-commit-hint" style={{ padding: '0 10px 8px' }}>No remote configured — pull is unavailable.</div>}
        </>
      ) : (
        <div className="git-empty">No conflicts. Nothing to resolve.</div>
      )}

      <div className="git-coming-soon" data-testid="git-conflict-coming-soon">
        <div className="git-coming-soon-title">
          <IconGitMerge size={13} strokeWidth={1.5} />
          Full conflict resolution
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
      </div>

      {confirmDiscard && (
        <ConfirmDialog
          title={mergeInProgress ? 'Abort merge?' : 'Discard local changes?'}
          confirmText={mergeInProgress ? 'Abort merge' : 'Discard'}
          confirmButtonColor="danger"
          onConfirm={handleDiscard}
          onCancel={() => setConfirmDiscard(false)}
        >
          <div>
            {mergeInProgress
              ? 'The merge will be aborted and your working tree returned to the state before it started.'
              : 'All uncommitted local changes will be discarded and the working tree reset to the last commit.'}{' '}
            This cannot be undone.
          </div>
        </ConfirmDialog>
      )}

      {confirmPull && (
        <ConfirmDialog
          title="Pull from remote?"
          confirmText="Pull"
          confirmButtonColor="primary"
          onConfirm={handlePull}
          onCancel={() => setConfirmPull(false)}
        >
          <div>
            Fetch and fast-forward <strong>{currentBranch || 'the current branch'}</strong> from{' '}
            <strong>origin</strong>. This only succeeds when your branch has no local commits the remote lacks.
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default ConflictTab;
