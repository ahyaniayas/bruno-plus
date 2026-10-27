import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconArchive, IconArrowDown, IconTrash } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import Button from 'ui/Button';
import ConfirmDialog from '../ConfirmDialog';
import { applyStash, createStash, dropStash } from 'providers/ReduxStore/slices/git/actions';
import { formatStashStats } from '../utils';

const StashTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dropTarget, setDropTarget] = useState(null);

  const { stashes, staged, unstaged, conflicted } = repo;
  const hasChanges = staged.length > 0 || unstaged.length > 0 || conflicted.length > 0;
  const canStash = hasChanges && message.trim().length > 0 && !busy;

  const handleCreate = async () => {
    if (!canStash) return;
    setBusy(true);
    try {
      await dispatch(createStash(collectionUid, collectionPath, message.trim()));
      setMessage('');
      toast.success('Changes stashed');
    } catch (error) {
      toast.error(error?.message || 'Failed to stash changes');
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async (stash) => {
    setBusy(true);
    try {
      await dispatch(applyStash(collectionUid, collectionPath, stash.index));
      toast.success('Stash applied');
    } catch (error) {
      toast.error(error?.message || 'Failed to apply stash');
    } finally {
      setBusy(false);
    }
  };

  const handleDropConfirmed = async () => {
    const target = dropTarget;
    setDropTarget(null);
    if (!target) return;
    setBusy(true);
    try {
      await dispatch(dropStash(collectionUid, collectionPath, target.index));
      toast.success('Stash dropped');
    } catch (error) {
      toast.error(error?.message || 'Failed to drop stash');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="git-split">
      {repo.error ? <div className="git-error">{repo.error}</div> : null}

      <div className="git-inline-form" style={{ flexDirection: 'column' }}>
        <input
          className="git-text-input"
          placeholder="Stash message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={busy}
          data-testid="git-stash-message"
        />
        <Button
          size="sm"
          fullWidth
          icon={<IconArchive size={13} strokeWidth={1.5} />}
          disabled={!canStash}
          loading={busy}
          onClick={handleCreate}
          data-testid="git-stash-btn"
        >
          Stash changes
        </Button>
        {!hasChanges && <span className="git-commit-hint">No local changes to stash.</span>}
      </div>

      <div className="git-section-title">Stashes ({stashes.length})</div>

      <div className="git-scroll">
        {stashes.length === 0 && <div className="git-empty">No stashes yet.</div>}
        {stashes.map((stash) => (
          <div className="git-row" key={stash.hash || stash.index} data-testid="git-stash-row">
            <div className="git-row-main">
              <div className="git-row-title" title={stash.message}>
                {stash.message}
              </div>
              <div className="git-row-sub">
                stash@{'{'}
                {stash.index}
                {'}'} · {formatStashStats(stash)}
              </div>
            </div>
            <ActionIcon
              label="Apply stash"
              onClick={() => handleApply(stash)}
              data-testid="git-stash-apply-btn"
            >
              <IconArrowDown size={13} strokeWidth={1.5} />
            </ActionIcon>
            <ActionIcon
              label="Drop stash"
              onClick={() => setDropTarget(stash)}
              data-testid="git-stash-drop-btn"
            >
              <IconTrash size={13} strokeWidth={1.5} />
            </ActionIcon>
          </div>
        ))}
      </div>

      {dropTarget && (
        <ConfirmDialog
          title="Drop stash?"
          confirmText="Drop"
          confirmButtonColor="danger"
          onConfirm={handleDropConfirmed}
          onCancel={() => setDropTarget(null)}
        >
          <div>
            <strong>{dropTarget.message}</strong> will be permanently removed. This cannot be undone.
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};

export default StashTab;
