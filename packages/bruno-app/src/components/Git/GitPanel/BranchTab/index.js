import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconBrandGit, IconPlus, IconCheck } from '@tabler/icons';
import Button from 'ui/Button';
import ActionIcon from 'ui/ActionIcon';
import ConfirmDialog from '../ConfirmDialog';
import { checkoutBranch, createBranch } from 'providers/ReduxStore/slices/git/actions';

const BranchTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const [newBranch, setNewBranch] = useState('');
  const [busy, setBusy] = useState(false);
  const [switchTarget, setSwitchTarget] = useState(null);

  const { branches, currentBranch } = repo;
  const canCreate = newBranch.trim().length > 0 && !busy;

  const handleCreate = async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      await dispatch(createBranch(collectionUid, collectionPath, newBranch.trim()));
      toast.success(`Switched to ${newBranch.trim()}`);
      setNewBranch('');
    } catch (error) {
      toast.error(error?.message || 'Failed to create branch');
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchConfirmed = async () => {
    const target = switchTarget;
    setSwitchTarget(null);
    if (!target) return;
    setBusy(true);
    try {
      await dispatch(checkoutBranch(collectionUid, collectionPath, target));
      toast.success(`Switched to ${target}`);
    } catch (error) {
      toast.error(error?.message || 'Failed to switch branch');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="git-split">
      {repo.error ? <div className="git-error">{repo.error}</div> : null}

      <div className="git-inline-form">
        <input
          className="git-text-input"
          placeholder="New branch name"
          value={newBranch}
          onChange={(event) => setNewBranch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleCreate();
          }}
          disabled={busy}
          data-testid="git-new-branch-input"
        />
        <Button
          size="sm"
          icon={<IconPlus size={13} strokeWidth={1.5} />}
          disabled={!canCreate}
          loading={busy}
          onClick={handleCreate}
          data-testid="git-create-branch-btn"
        >
          Create
        </Button>
      </div>

      <div className="git-section-title">Branches ({branches.length})</div>

      <div className="git-scroll">
        {branches.length === 0 && <div className="git-empty">No branches found.</div>}
        {branches.map((branch) => {
          const isCurrent = branch === currentBranch;
          return (
            <div
              className="git-row"
              key={branch}
              data-testid="git-branch-row"
              style={{ cursor: isCurrent ? 'default' : 'pointer' }}
              onClick={() => {
                if (!isCurrent && !busy) setSwitchTarget(branch);
              }}
            >
              <IconBrandGit size={13} strokeWidth={1.5} />
              <div className="git-row-main">
                <div className="git-row-title" title={branch}>
                  {branch}
                </div>
              </div>
              {isCurrent ? (
                <span className="git-current-badge" data-testid="git-current-branch">
                  current
                </span>
              ) : (
                <span className="git-file-actions">
                  <ActionIcon label={`Switch to ${branch}`} onClick={() => setSwitchTarget(branch)}>
                    <IconCheck size={13} strokeWidth={1.5} />
                  </ActionIcon>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {switchTarget && (
        <ConfirmDialog
          title="Switch branch?"
          confirmText="Switch"
          confirmButtonColor="primary"
          onConfirm={handleSwitchConfirmed}
          onCancel={() => setSwitchTarget(null)}
        >
          <div>
            Switch from <strong>{currentBranch}</strong> to <strong>{switchTarget}</strong>?
            {(repo.staged.length > 0 || repo.unstaged.length > 0) && (
              <div style={{ marginTop: 8 }}>
                You have uncommitted changes. Git will refuse the switch if they conflict with the target branch.
              </div>
            )}
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default BranchTab;
