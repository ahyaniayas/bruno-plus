import {
  setRepoResolved,
  setRepoData,
  setRepoStatus,
  setStashes,
  setRepoLoading,
  setRepoError
} from './index';

const invoke = (channel, payload) => window.ipcRenderer.invoke(channel, payload);

const errorMessage = (error, fallback) => error?.message || fallback;

/**
 * Read branch / remote info for a collection.
 *
 * A collection that is not inside a git repo is a normal state, not an error:
 * we mark it resolved with a null root so the panel can hide itself.
 */
export const loadRepoData = (collectionUid, collectionPath) => async (dispatch) => {
  if (!collectionUid || !collectionPath) return null;

  try {
    const data = await invoke('renderer:git-get-data', { collectionPath });
    dispatch(setRepoResolved({ collectionUid, gitRootPath: data.gitRootPath }));
    dispatch(
      setRepoData({
        collectionUid,
        currentBranch: data.currentBranch,
        branches: data.branches,
        remoteUrl: data.remoteUrl,
        mergeInProgress: data.mergeInProgress
      })
    );
    return data;
  } catch (error) {
    // "not part of a git repository" is expected for plain folders. Clear the
    // whole repo view: leaving the old branch list behind would keep showing
    // branches for a repo that no longer exists.
    dispatch(setRepoResolved({ collectionUid, gitRootPath: null }));
    dispatch(
      setRepoData({
        collectionUid,
        currentBranch: '',
        branches: [],
        remoteUrl: '',
        mergeInProgress: false
      })
    );
    dispatch(setRepoStatus({ collectionUid, staged: [], unstaged: [], conflicted: [] }));
    dispatch(setStashes({ collectionUid, stashes: [] }));
    return null;
  }
};

export const loadRepoStatus = (collectionUid, collectionPath) => async (dispatch) => {
  if (!collectionUid || !collectionPath) return null;

  try {
    const status = await invoke('renderer:git-get-status', { collectionPath });
    dispatch(
      setRepoStatus({
        collectionUid,
        staged: status.staged,
        unstaged: status.unstaged,
        conflicted: status.conflicted,
        tooManyFiles: status.tooManyFiles,
        mergeInProgress: status.mergeInProgress,
        timestamp: Date.now()
      })
    );
    return status;
  } catch (error) {
    dispatch(setRepoError({ collectionUid, error: errorMessage(error, 'Failed to read git status') }));
    return null;
  }
};

export const loadStashes = (collectionUid, collectionPath) => async (dispatch) => {
  if (!collectionUid || !collectionPath) return null;

  try {
    const { stashes } = await invoke('renderer:git-stash-list', { collectionPath });
    dispatch(setStashes({ collectionUid, stashes }));
    return stashes;
  } catch (error) {
    dispatch(setRepoError({ collectionUid, error: errorMessage(error, 'Failed to read stashes') }));
    return null;
  }
};

/**
 * Refresh everything the panel shows. Kept as one thunk so callers after a
 * mutation cannot forget one of the three reads.
 */
export const refreshRepo = (collectionUid, collectionPath) => async (dispatch) => {
  dispatch(setRepoLoading({ collectionUid, isLoading: true }));
  try {
    await dispatch(loadRepoData(collectionUid, collectionPath));
    await Promise.all([
      dispatch(loadRepoStatus(collectionUid, collectionPath)),
      dispatch(loadStashes(collectionUid, collectionPath))
    ]);
  } finally {
    dispatch(setRepoLoading({ collectionUid, isLoading: false }));
  }
};

const runMutation = (collectionUid, collectionPath, channel, payload, fallbackError) => async (dispatch) => {
  dispatch(setRepoError({ collectionUid, error: null }));
  try {
    const result = await invoke(channel, { collectionPath, ...payload });
    await dispatch(refreshRepo(collectionUid, collectionPath));
    return result;
  } catch (error) {
    const message = errorMessage(error, fallbackError);
    dispatch(setRepoError({ collectionUid, error: message }));
    throw error;
  }
};

export const stageFiles = (collectionUid, collectionPath, filePaths) =>
  runMutation(collectionUid, collectionPath, 'renderer:git-stage', { filePaths }, 'Failed to stage files');

export const unstageFiles = (collectionUid, collectionPath, filePaths) =>
  runMutation(collectionUid, collectionPath, 'renderer:git-unstage', { filePaths }, 'Failed to unstage files');

export const discardFiles = (collectionUid, collectionPath, filePaths) =>
  runMutation(collectionUid, collectionPath, 'renderer:git-discard', { filePaths }, 'Failed to discard changes');

export const commitChanges = (collectionUid, collectionPath, message) =>
  runMutation(collectionUid, collectionPath, 'renderer:git-commit', { message }, 'Failed to commit');

export const createBranch = (collectionUid, collectionPath, branchName, processUid) =>
  runMutation(
    collectionUid,
    collectionPath,
    'renderer:git-create-branch',
    { branchName, processUid },
    'Failed to create branch'
  );

export const checkoutBranch = (collectionUid, collectionPath, branchName, processUid) =>
  runMutation(
    collectionUid,
    collectionPath,
    'renderer:git-checkout-branch',
    { branchName, processUid },
    'Failed to switch branch'
  );

export const createStash = (collectionUid, collectionPath, message) =>
  runMutation(collectionUid, collectionPath, 'renderer:git-stash-create', { message }, 'Failed to stash changes');

export const applyStash = (collectionUid, collectionPath, stashIndex) =>
  runMutation(collectionUid, collectionPath, 'renderer:git-stash-apply', { stashIndex }, 'Failed to apply stash');

export const dropStash = (collectionUid, collectionPath, stashIndex) =>
  runMutation(collectionUid, collectionPath, 'renderer:git-stash-drop', { stashIndex }, 'Failed to drop stash');

export const pullBranch = (collectionUid, collectionPath, { remote, remoteBranch, strategy, processUid }) =>
  runMutation(
    collectionUid,
    collectionPath,
    'renderer:git-pull',
    { remote, remoteBranch, strategy, processUid },
    'Failed to pull'
  );

export const discardConflict = (collectionUid, collectionPath) =>
  runMutation(collectionUid, collectionPath, 'renderer:git-discard-conflict', {}, 'Failed to discard conflict');

/**
 * Turn the collection into a git repository. After init the panel must
 * re-resolve the repo root, so this refreshes rather than patching state.
 */
export const initRepo = (collectionUid, collectionPath, { remoteUrl, branch } = {}) => async (dispatch) => {
  dispatch(setRepoError({ collectionUid, error: null }));
  try {
    const result = await invoke('renderer:git-init', { collectionPath, remoteUrl, branch });
    await dispatch(refreshRepo(collectionUid, collectionPath));
    return result;
  } catch (error) {
    const message = errorMessage(error, 'Failed to initialize repository');
    dispatch(setRepoError({ collectionUid, error: message }));
    throw error;
  }
};

export const setRemote = (collectionUid, collectionPath, remoteUrl) => async (dispatch) => {
  dispatch(setRepoError({ collectionUid, error: null }));
  try {
    const result = await invoke('renderer:git-set-remote', { collectionPath, remoteUrl });
    await dispatch(refreshRepo(collectionUid, collectionPath));
    return result;
  } catch (error) {
    const message = errorMessage(error, 'Failed to update remote');
    dispatch(setRepoError({ collectionUid, error: message }));
    throw error;
  }
};

export const getRemotes = (collectionPath) => async () => {
  const { remotes } = await invoke('renderer:git-get-remotes', { collectionPath });
  return remotes || [];
};

/**
 * Delete the collection's `.git` directory. Destructive, so the caller must
 * confirm first. Afterwards the repo root no longer resolves, which flips the
 * panel back to the Initialize Git empty state.
 */
export const removeGitDir = (collectionUid, collectionPath) => async (dispatch) => {
  dispatch(setRepoError({ collectionUid, error: null }));
  try {
    const result = await invoke('renderer:git-remove-git-dir', { collectionPath });
    await dispatch(refreshRepo(collectionUid, collectionPath));
    return result;
  } catch (error) {
    const message = errorMessage(error, 'Failed to remove .git');
    dispatch(setRepoError({ collectionUid, error: message }));
    throw error;
  }
};

/**
 * Diffs are read on demand and returned to the caller rather than stored.
 */
export const getFileDiff = (collectionPath, filePath, staged) => async () => {
  const { diff } = await invoke('renderer:git-get-file-diff', { collectionPath, filePath, staged });
  return diff;
};
