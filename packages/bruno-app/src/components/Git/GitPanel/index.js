import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconBrandGit, IconRefresh } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import { refreshRepo } from 'providers/ReduxStore/slices/git/actions';
import StyledWrapper from './StyledWrapper';
import ChangesTab from './ChangesTab';
import StashTab from './StashTab';
import BranchTab from './BranchTab';
import ConflictTab from './ConflictTab';

const TABS = [
  { id: 'changes', label: 'Changes' },
  { id: 'stash', label: 'Stash' },
  { id: 'branch', label: 'Branch' },
  { id: 'conflict', label: 'Merge' }
];

const EMPTY_REPO = {
  gitRootPath: null,
  isRepoResolved: false,
  currentBranch: '',
  branches: [],
  remoteUrl: '',
  mergeInProgress: false,
  staged: [],
  unstaged: [],
  conflicted: [],
  stashes: [],
  tooManyFiles: false,
  isLoading: false,
  error: null
};

const GitPanel = ({ collectionUid, collectionPath }) => {
  const dispatch = useDispatch();
  const repo = useSelector((state) => state.git.repos[collectionUid]) || EMPTY_REPO;
  const [activeTab, setActiveTab] = useState('changes');

  const isRepo = !!repo.gitRootPath;

  useEffect(() => {
    if (!collectionUid || !collectionPath) return;
    dispatch(refreshRepo(collectionUid, collectionPath));
  }, [collectionUid, collectionPath, dispatch]);

  // Nothing to render until we know whether this collection is a repo at all.
  if (!repo.isRepoResolved) {
    return <div className="git-spinner">Checking repository…</div>;
  }

  if (!isRepo) {
    return <div className="git-empty">This collection is not inside a git repository.</div>;
  }

  const changeCount = repo.staged.length + repo.unstaged.length;
  const conflictCount = repo.conflicted.length;

  const renderTab = () => {
    switch (activeTab) {
      case 'stash':
        return <StashTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
      case 'branch':
        return <BranchTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
      case 'conflict':
        return <ConflictTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
      case 'changes':
      default:
        return <ChangesTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
    }
  };

  return (
    <StyledWrapper data-testid="git-panel">
      <div className="git-panel-header">
        <span className="git-branch-name" title={repo.currentBranch}>
          <IconBrandGit size={13} strokeWidth={1.5} />
          {repo.currentBranch || 'detached'}
        </span>
        <span className="git-refresh">
          <ActionIcon
            label="Refresh git status"
            onClick={() => dispatch(refreshRepo(collectionUid, collectionPath))}
            data-testid="git-refresh-btn"
          >
            <IconRefresh size={13} strokeWidth={1.5} />
          </ActionIcon>
        </span>
      </div>

      <div className="git-tabs">
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={`git-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`git-tab-${tab.id}`}
          >
            {tab.label}
            {tab.id === 'changes' && changeCount > 0 && <span className="git-tab-count">{changeCount}</span>}
            {tab.id === 'conflict' && conflictCount > 0 && <span className="git-tab-badge">{conflictCount}</span>}
          </button>
        ))}
      </div>

      <div className="git-body">{renderTab()}</div>
    </StyledWrapper>
  );
};

export default GitPanel;
