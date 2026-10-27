import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconBrandGit } from '@tabler/icons';
import GitConfigForm from 'components/Git/GitConfigForm';
import { initRepo } from 'providers/ReduxStore/slices/git/actions';
import StyledWrapper from '../StyledWrapper';

/**
 * Shown when the collection is not tracked by git yet.
 *
 * Offers the full setup up front — remote URL and branch — so a new repo can be
 * connected to its upstream in one step instead of being initialised empty.
 * The remote fields are optional: submitting with them blank still initialises
 * a local-only repository.
 */
const InitRepoEmptyState = ({ collectionUid, collectionPath }) => {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);

  const handleInit = async ({ remoteUrl, branch }) => {
    setBusy(true);
    try {
      await dispatch(initRepo(collectionUid, collectionPath, { remoteUrl, branch }));
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
          Start tracking your changes with Git. Add a remote to connect this collection to an existing repository, or
          leave it empty to keep everything local.
        </p>
        <GitConfigForm
          submitLabel="Initialize Git"
          submitting={busy}
          onSubmit={handleInit}
          dataTestId="git-init-form"
        />
      </div>
    </StyledWrapper>
  );
};

export default InitRepoEmptyState;
