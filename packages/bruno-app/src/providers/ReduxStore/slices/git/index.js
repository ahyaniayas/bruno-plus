import { createSlice } from '@reduxjs/toolkit';

/**
 * Git state for the Git panel.
 *
 * Keyed by collection uid so switching collections keeps each repo's view
 * independent. Everything here is plain serializable data: file lists come
 * from `git status` and diffs are fetched on demand, never cached in bulk.
 *
 * Diffs are intentionally *not* stored in the slice. They can be large and
 * are only ever needed by one visible editor pane, so the component keeps
 * them in local state and this slice stays cheap to serialize.
 */
const emptyRepo = {
  // Resolved repository root. Null means "not a git repo" (panel hidden).
  gitRootPath: null,
  isRepoResolved: false,
  currentBranch: '',
  branches: [],
  remoteUrl: '',
  ahead: 0,
  behind: 0,
  aheadCommits: [],
  mergeInProgress: false,
  staged: [],
  unstaged: [],
  conflicted: [],
  stashes: [],
  tooManyFiles: false,
  isLoading: false,
  // Incremented after every mutation so consumers can re-read derived state.
  lastUpdatedAt: null,
  error: null
};

const initialState = {
  repos: {}
};

const ensureRepo = (state, collectionUid) => {
  if (!state.repos[collectionUid]) {
    state.repos[collectionUid] = { ...emptyRepo };
  }
  return state.repos[collectionUid];
};

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    setRepoResolved: (state, action) => {
      const { collectionUid, gitRootPath } = action.payload;
      const repo = ensureRepo(state, collectionUid);
      repo.gitRootPath = gitRootPath || null;
      repo.isRepoResolved = true;
    },

    setRepoData: (state, action) => {
      const { collectionUid, currentBranch, branches, remoteUrl, mergeInProgress, ahead, behind, aheadCommits } = action.payload;
      const repo = ensureRepo(state, collectionUid);
      repo.currentBranch = currentBranch || '';
      repo.branches = branches || [];
      repo.remoteUrl = remoteUrl || '';
      repo.mergeInProgress = !!mergeInProgress;
      repo.ahead = ahead || 0;
      repo.behind = behind || 0;
      repo.aheadCommits = aheadCommits || [];
    },

    setRepoStatus: (state, action) => {
      const { collectionUid, staged, unstaged, conflicted, tooManyFiles, mergeInProgress } = action.payload;
      const repo = ensureRepo(state, collectionUid);
      repo.staged = staged || [];
      repo.unstaged = unstaged || [];
      repo.conflicted = conflicted || [];
      repo.tooManyFiles = !!tooManyFiles;
      if (typeof mergeInProgress === 'boolean') {
        repo.mergeInProgress = mergeInProgress;
      }
      repo.lastUpdatedAt = action.payload.timestamp ?? null;
    },

    setStashes: (state, action) => {
      const { collectionUid, stashes } = action.payload;
      ensureRepo(state, collectionUid).stashes = stashes || [];
    },

    setRepoLoading: (state, action) => {
      const { collectionUid, isLoading } = action.payload;
      ensureRepo(state, collectionUid).isLoading = !!isLoading;
    },

    setRepoError: (state, action) => {
      const { collectionUid, error } = action.payload;
      ensureRepo(state, collectionUid).error = error || null;
    },

    clearRepo: (state, action) => {
      delete state.repos[action.payload];
    }
  }
});

export const {
  setRepoResolved,
  setRepoData,
  setRepoStatus,
  setStashes,
  setRepoLoading,
  setRepoError,
  clearRepo
} = gitSlice.actions;

export default gitSlice.reducer;
