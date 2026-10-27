import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconBrandGit, IconRefresh } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import { setRepoError } from 'providers/ReduxStore/slices/git';
import { refreshRepo } from 'providers/ReduxStore/slices/git/actions';
import StyledWrapper from './StyledWrapper';
import ChangesTab from './ChangesTab';
import StashTab from './StashTab';
import BranchTab from './BranchTab';
import PullTab from './PullTab';
import GitignoreTab from './GitignoreTab';
import ReadmeTab from './ReadmeTab';
import ConfigTab from './ConfigTab';
import InitRepoEmptyState from './InitRepoEmptyState';

const TABS = [
  { id: 'changes', label: 'Changes' },
  { id: 'pull', label: 'Pull' },
  { id: 'stash', label: 'Stash' },
  { id: 'branch', label: 'Branch' },
  { id: 'gitignore', label: '.gitignore' },
  { id: 'readme', label: 'Readme' },
  { id: 'config', label: 'Config' }
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
    return <InitRepoEmptyState collectionUid={collectionUid} collectionPath={collectionPath} />;
  }

  const changeCount = repo.staged.length + repo.unstaged.length;
  const conflictCount = repo.conflicted.length;

  const handleTabClick = (tabId) => {
    dispatch(setRepoError({ collectionUid, error: null }));
    setActiveTab(tabId);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'pull':
        return <PullTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
      case 'stash':
        return <StashTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
      case 'branch':
        return <BranchTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
      case 'gitignore':
        return <GitignoreTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
      case 'readme':
        return <ReadmeTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
      case 'config':
        return <ConfigTab collectionUid={collectionUid} collectionPath={collectionPath} repo={repo} />;
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
          {repo.currentBranch || 'no branch'}
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
            onClick={() => handleTabClick(tab.id)}
            data-testid={`git-tab-${tab.id}`}
          >
            {tab.label}
            {tab.id === 'changes' && changeCount > 0 && <span className="git-tab-count">{changeCount}</span>}
            {tab.id === 'pull' && conflictCount > 0 && <span className="git-tab-badge">{conflictCount}</span>}
          </button>
        ))}
      </div>

      <div className="git-body">{renderTab()}</div>
    </StyledWrapper>
  );
};

export default GitPanel;
