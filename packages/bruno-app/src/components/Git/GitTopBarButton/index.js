import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconBrandGit, IconCheck, IconChevronDown, IconPlugOff, IconPlus } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { checkoutBranch, createBranch, loadRepoData } from 'providers/ReduxStore/slices/git/actions';
import RemoveGitDirModal from './RemoveGitDirModal';

/**
 * Top-bar entry point for the Git panel.
 *
 * Two separate controls by design:
 *  - the label is a plain button that opens the panel (the common action)
 *  - the caret opens the menu for branch switching and repo-level actions
 *
 * Mixing both into one button made the primary action ambiguous.
 */
const GitTopBarButton = ({ collectionUid, collectionPath, onOpenPanel }) => {
  const dispatch = useDispatch();
  const repo = useSelector((state) => state.git.repos[collectionUid]);
  const [busy, setBusy] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);

  const isRepo = !!repo?.gitRootPath;
  const currentBranch = repo?.currentBranch || '';
  const label = isRepo && currentBranch ? `Git Plus - ${currentBranch}` : 'Git Plus';

  // Resolve once so the top bar can show the branch without opening the panel.
  useEffect(() => {
    if (!collectionUid || !collectionPath) return;
    if (repo?.isRepoResolved) return;
    dispatch(loadRepoData(collectionUid, collectionPath));
  }, [collectionUid, collectionPath, repo?.isRepoResolved, dispatch]);

  const handleSwitch = async (branch) => {
    if (!branch || branch === currentBranch) return;
    setBusy(true);
    try {
      await dispatch(checkoutBranch(collectionUid, collectionPath, branch));
      toast.success(`Switched to ${branch}`);
    } catch (error) {
      toast.error(error?.message || 'Failed to switch branch');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    const name = window.prompt('New branch name');
    if (!name || !name.trim()) return;
    setBusy(true);
    try {
      await dispatch(createBranch(collectionUid, collectionPath, name.trim()));
      toast.success(`Switched to ${name.trim()}`);
    } catch (error) {
      toast.error(error?.message || 'Failed to create branch');
    } finally {
      setBusy(false);
    }
  };

  const branchItems = (repo?.branches || []).map((branch) => ({
    id: `branch-${branch}`,
    label: branch,
    leftSection: branch === currentBranch ? <IconCheck size={13} strokeWidth={1.5} /> : <span style={{ width: 13 }} />,
    onClick: () => handleSwitch(branch)
  }));

  const items = [
    ...branchItems,
    ...(branchItems.length ? [{ id: 'divider-branch', type: 'divider' }] : []),
    {
      id: 'create-branch',
      label: 'Create branch…',
      leftSection: <IconPlus size={13} strokeWidth={1.5} />,
      onClick: handleCreate
    },
    ...(isRepo
      ? [
          { id: 'divider-repo', type: 'divider' },
          {
            id: 'disconnect-git',
            label: 'Disconnect Git',
            leftSection: <IconPlugOff size={13} strokeWidth={1.5} />,
            onClick: () => setRemoveModalOpen(true)
          }
        ]
      : [])
  ];

  return (
    <>
      <div className={`git-topbar-group ${isRepo ? 'is-repo' : ''}`} data-testid="git-topbar-group">
        <button
          type="button"
          className="git-topbar-main"
          disabled={busy}
          onClick={onOpenPanel}
          title={isRepo ? `Open Git Plus — on branch ${currentBranch}` : 'Open Git Plus'}
          data-testid="git-topbar-open-btn"
        >
          <IconBrandGit size={14} strokeWidth={1.5} />
          <span className="git-topbar-label">{label}</span>
        </button>
        <MenuDropdown items={items} placement="bottom-end" data-testid="git-topbar-menu">
          <button
            type="button"
            className="git-topbar-caret"
            disabled={busy}
            title="Git actions"
            aria-label="Git actions"
            data-testid="git-topbar-caret-btn"
          >
            <IconChevronDown size={13} strokeWidth={1.5} />
          </button>
        </MenuDropdown>
      </div>

      {removeModalOpen && (
        <RemoveGitDirModal
          collectionUid={collectionUid}
          collectionPath={collectionPath}
          onClose={() => setRemoveModalOpen(false)}
        />
      )}
    </>
  );
};

export default GitTopBarButton;
