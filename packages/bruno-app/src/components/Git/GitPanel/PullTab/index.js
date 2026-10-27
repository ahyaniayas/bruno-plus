import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconCloudDownload } from '@tabler/icons';
import Button from 'ui/Button';
import ConfirmDialog from '../ConfirmDialog';
import { pullBranch } from 'providers/ReduxStore/slices/git/actions';

const STRATEGIES = [
  {
    id: '--ff-only',
    label: 'Fast-forward only',
    description: 'Safest. Fails instead of creating a merge commit when the branch has diverged.'
  },
  {
    id: '--no-rebase',
    label: 'Merge',
    description: 'Creates a merge commit when the branch has diverged.'
  }
];

/**
 * Pull tab.
 *
 * Pulling is the mirror of the Merge tab's remote action, but available at any
 * time rather than only when there is a conflict.
 */
const PullTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const [strategy, setStrategy] = useState('--ff-only');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { remoteUrl, currentBranch, staged, unstaged } = repo;
  const hasLocalChanges = staged.length > 0 || unstaged.length > 0;
  const canPull = !!remoteUrl && !!currentBranch && !busy;

  const handlePull = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      await dispatch(
        pullBranch(collectionUid, collectionPath, {
          remoteBranch: currentBranch,
          strategy
        })
      );
      toast.success(`Pulled ${currentBranch} from origin`);
    } catch (error) {
      toast.error(error?.message || 'Failed to pull');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="git-split">
      {repo.error ? <div className="git-error">{repo.error}</div> : null}

      <div className="git-section-title">Pull from origin</div>

      <div className="git-scroll" style={{ padding: '8px 10px' }}>
        {!remoteUrl && (
          <div className="git-empty" data-testid="git-pull-no-remote">
            No remote configured. Add one in the Config tab to enable pull.
          </div>
        )}

        {remoteUrl && (
          <>
            <div className="git-row-sub" style={{ marginBottom: 10 }}>
              {currentBranch} ← origin
            </div>

            {STRATEGIES.map((option) => (
              <label className="git-pull-option" key={option.id} data-testid={`git-pull-strategy-${option.id}`}>
                <input
                  type="radio"
                  name="pull-strategy"
                  value={option.id}
                  checked={strategy === option.id}
                  onChange={() => setStrategy(option.id)}
                  disabled={busy}
                />
                <span className="git-pull-option-body">
                  <span className="git-pull-option-label">{option.label}</span>
                  <span className="git-pull-option-desc">{option.description}</span>
                </span>
              </label>
            ))}

            {hasLocalChanges && (
              <div className="git-commit-hint" style={{ marginTop: 8 }} data-testid="git-pull-local-changes">
                You have uncommitted changes. Git will refuse the pull if they conflict with incoming changes.
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
                Pull
              </Button>
            </div>
          </>
        )}
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
            <strong>{strategy === '--ff-only' ? 'fast-forward only' : 'merge'}</strong>.
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default PullTab;
