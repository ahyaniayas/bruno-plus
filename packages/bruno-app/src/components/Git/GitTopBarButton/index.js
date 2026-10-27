import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconBrandGit, IconCheck, IconChevronDown, IconPlus } from '@tabler/icons';
import MenuDropdown from 'ui/MenuDropdown';
import { checkoutBranch, createBranch, loadRepoData } from 'providers/ReduxStore/slices/git/actions';

/**
 * Top-bar entry point for the Git panel.
 *
 * Label carries the current branch once the collection is tracked, and the
 * dropdown is the quick branch switcher. Creating a branch happens through a
 * prompt rather than a modal: it is a single text field.
 */
const GitTopBarButton = ({ collectionUid, collectionPath, onOpenPanel }) => {
  const dispatch = useDispatch();
  const repo = useSelector((state) => state.git.repos[collectionUid]);
  const [busy, setBusy] = useState(false);

  const isRepo = !!repo?.gitRootPath;
  const currentBranch = repo?.currentBranch || '';
  const label = isRepo ? `Git Plus - ${currentBranch || 'unknown'}` : 'Git Plus';

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
    {
      id: 'open-panel',
      label: 'Open Git Plus panel',
      leftSection: <IconBrandGit size={13} strokeWidth={1.5} />,
      onClick: onOpenPanel
    }
  ];

  const button = (
    <button
      type="button"
      className={`git-topbar-btn ${isRepo ? 'is-repo' : ''}`}
      disabled={busy}
      data-testid="git-topbar-btn"
      title={isRepo ? `On branch ${currentBranch}` : 'Git Plus'}
    >
      <IconBrandGit size={14} strokeWidth={1.5} />
      <span className="git-topbar-label">{label}</span>
      <IconChevronDown size={13} strokeWidth={1.5} />
    </button>
  );

  return (
    <MenuDropdown items={items} placement="bottom-end" data-testid="git-topbar-menu">
      {button}
    </MenuDropdown>
  );
};

export default GitTopBarButton;
