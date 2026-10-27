import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconBrandGit } from '@tabler/icons';
import Button from 'ui/Button';
import { initRepo } from 'providers/ReduxStore/slices/git/actions';
import StyledWrapper from '../StyledWrapper';

/**
 * Shown when the collection is not tracked by git yet.
 *
 * Mirrors the "Initialize Git Repository" empty state: one clear action, with
 * an explanation of what it does, rather than a bare button.
 */
const InitRepoEmptyState = ({ collectionUid, collectionPath }) => {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);

  const handleInit = async () => {
    setBusy(true);
    try {
      await dispatch(initRepo(collectionUid, collectionPath));
      toast.success('Git repository initialized');
    } catch (error) {
      toast.error(error?.message || 'Failed to initialize repository');
    } finally {
      setBusy(false);
    }
  };

  return (
    <StyledWrapper data-testid="git-init-empty-state">
      <div className="git-init-card">
        <div className="git-init-icon">
          <IconBrandGit size={22} strokeWidth={1.5} />
        </div>
        <h2 className="git-init-title">Initialize Git Repository</h2>
        <p className="git-init-description">
          Start tracking your changes with Git. Initialize a new repository to enable version control.
        </p>
        <Button
          variant="outline"
          color="secondary"
          icon={<IconBrandGit size={14} strokeWidth={1.5} />}
          loading={busy}
          disabled={busy}
          onClick={handleInit}
          data-testid="git-init-btn"
        >
          Initialize Git
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default InitRepoEmptyState;
