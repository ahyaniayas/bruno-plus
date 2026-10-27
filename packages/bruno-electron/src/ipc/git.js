const path = require('path');
const fs = require('fs');
const { ipcMain } = require('electron');
const {
  cloneGitRepository,
  getCollectionGitRepoUrl,
  listBranchesForRemoteUrl,
  getCollectionGitRootPath,
  invalidateCollectionGitRootPath,
  initGit,
  addRemote,
  removeRemote,
  fetchRemotes,
  setRemoteUrl,
  setUpstreamBranch,
  getCollectionGitBranches,
  getCurrentGitBranch,
  getDefaultGitBranch,
  getChangedFilesInCollectionGit,
  stageChanges,
  unstageChanges,
  discardChanges,
  commitChanges,
  getStagedFileDiff,
  getUnstagedFileDiff,
  checkoutGitBranch,
  createStash,
  listStashes,
  applyStash,
  dropStash,
  pullGitChanges,
  resetHardToHead,
  isMergeInProgress
} = require('../utils/git');
const { createDirectory, removeDirectory } = require('../utils/filesystem');
const getCollectionGitRemoteUrl = async (collectionPath) => {
  try {
    const url = await getCollectionGitRepoUrl(collectionPath);
    return url || null;
  } catch (error) {
    return null;
  }
};

const handleListRemoteBranches = async (event, { url }) => {
  const repositoryUrl = typeof url === 'string' ? url.trim() : '';
  if (!repositoryUrl) {
    throw new Error('Repository URL is required');
  }
  // git reads a dash-leading url as a command option, not a repository
  if (repositoryUrl.startsWith('-')) {
    throw new Error('Repository URL is not valid');
  }

  return listBranchesForRemoteUrl({ url: repositoryUrl });
};

// ---------------------------------------------------------------------------
// Validation helpers
//
// The preload bridge has no channel allowlist, so every value crossing IPC is
// untrusted. These helpers are the single gate between renderer input and git.
// ---------------------------------------------------------------------------

const requireCollectionPath = (collectionPath) => {
  if (typeof collectionPath !== 'string' || !collectionPath.trim()) {
    throw new Error('Collection path is required');
  }
  return collectionPath;
};

/**
 * Resolve the git root for a collection. The renderer only ever supplies the
 * collection path; the repository root is always derived here so a caller
 * cannot point git at an arbitrary directory on disk.
 */
const resolveGitRootPath = (collectionPath) => {
  const gitRootPath = getCollectionGitRootPath(requireCollectionPath(collectionPath));
  if (!gitRootPath) {
    throw new Error('Collection is not part of a git repository');
  }
  return gitRootPath;
};

const requireNonEmptyString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value;
};

/**
 * Branch names are passed to git as arguments. Reject anything git would read
 * as an option, and anything that is not a legal ref name.
 */
const requireBranchName = (branchName) => {
  const name = requireNonEmptyString(branchName, 'Branch name').trim();
  if (name.startsWith('-')) {
    throw new Error('Branch name is not valid');
  }
  if (name.includes('..') || name.includes(' ') || name.includes('\\') || name.endsWith('/')) {
    throw new Error('Branch name is not valid');
  }
  if (/[\x00-\x1f\x7f~^:?*[\]@]/.test(name)) {
    throw new Error('Branch name is not valid');
  }
  return name;
};

/**
 * Resolve a repository-relative path to an absolute path, refusing anything
 * that escapes the repository. `discardChanges` deletes untracked files, so an
 * unchecked `../../` here would be a filesystem write primitive.
 */
const resolveRepoFilePath = (gitRootPath, filePath) => {
  const input = requireNonEmptyString(filePath, 'File path');
  const absolutePath = path.isAbsolute(input) ? path.resolve(input) : path.resolve(gitRootPath, input);
  const relativePath = path.relative(gitRootPath, absolutePath);

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`File path is outside the repository: ${filePath}`);
  }
  return absolutePath;
};

const resolveRepoFilePaths = (gitRootPath, filePaths) => {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    throw new Error('At least one file path is required');
  }
  return filePaths.map((filePath) => resolveRepoFilePath(gitRootPath, filePath));
};

const requireStashIndex = (stashIndex) => {
  if (!Number.isInteger(stashIndex) || stashIndex < 0) {
    throw new Error('Stash index is not valid');
  }
  return stashIndex;
};

// ---------------------------------------------------------------------------
// Handlers
//
// Exported so they can be unit tested without booting Electron. The
// `ipcMain.handle` calls below only wire channels to these functions.
// ---------------------------------------------------------------------------

/**
 * Branch, remote and root-path snapshot for a collection. Each lookup is
 * allowed to fail independently: a local-only repo has no `origin`, and we
 * still want to render the branch list rather than rejecting the whole call.
 */
const handleGetCollectionGitData = async (event, { collectionPath } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);

  const [branches, currentBranch, remoteUrl, defaultBranch] = await Promise.all([
    getCollectionGitBranches(gitRootPath).catch(() => []),
    getCurrentGitBranch(gitRootPath).catch(() => ''),
    getCollectionGitRepoUrl(gitRootPath).catch(() => ''),
    getDefaultGitBranch(gitRootPath).catch(() => '')
  ]);

  // A freshly initialised repo has no commits yet, so `branchLocal` returns
  // nothing even though HEAD already points at the branch. Fall back to the
  // symbolic ref so the panel shows a branch name instead of "detached".
  const resolvedBranch = currentBranch || defaultBranch || '';
  const resolvedBranches = branches.length ? branches : resolvedBranch ? [resolvedBranch] : [];

  return {
    gitRootPath,
    branches: resolvedBranches,
    currentBranch: resolvedBranch,
    remoteUrl: remoteUrl || '',
    mergeInProgress: isMergeInProgress(gitRootPath)
  };
};

const handleGetStatus = async (event, { collectionPath } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const status = await getChangedFilesInCollectionGit(gitRootPath, collectionPath);

  return {
    gitRootPath,
    staged: status.staged || [],
    unstaged: status.unstaged || [],
    conflicted: status.conflicted || [],
    totalFiles: status.totalFiles || 0,
    tooManyFiles: !!status.tooManyFiles,
    mergeInProgress: isMergeInProgress(gitRootPath)
  };
};

const handleStage = async (event, { collectionPath, filePaths } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  await stageChanges(gitRootPath, resolveRepoFilePaths(gitRootPath, filePaths));
  return { success: true };
};

const handleUnstage = async (event, { collectionPath, filePaths } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  await unstageChanges(gitRootPath, resolveRepoFilePaths(gitRootPath, filePaths));
  return { success: true };
};

const handleDiscard = async (event, { collectionPath, filePaths } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const result = await discardChanges(gitRootPath, resolveRepoFilePaths(gitRootPath, filePaths));
  return { success: true, ...result };
};

const handleCommit = async (event, { collectionPath, message } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const commitMessage = requireNonEmptyString(message, 'Commit message');
  const result = await commitChanges(gitRootPath, commitMessage);
  return { success: true, commit: result?.commit || null };
};

const handleGetFileDiff = async (event, { collectionPath, filePath, staged = false } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const absolutePath = resolveRepoFilePath(gitRootPath, filePath);
  const diff = staged
    ? await getStagedFileDiff(gitRootPath, absolutePath)
    : await getUnstagedFileDiff(gitRootPath, absolutePath);

  return { diff: diff || '' };
};

const handleCreateBranch = async (mainWindow, event, { collectionPath, branchName, processUid } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const name = requireBranchName(branchName);
  await checkoutGitBranch(mainWindow, { gitRootPath, branchName: name, processUid, shouldCreate: true });
  return { success: true, branchName: name };
};

const handleCheckoutBranch = async (mainWindow, event, { collectionPath, branchName, processUid } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const name = requireBranchName(branchName);
  await checkoutGitBranch(mainWindow, { gitRootPath, branchName: name, processUid });
  return { success: true, branchName: name };
};

const handleCreateStash = async (event, { collectionPath, message } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const stashMessage = requireNonEmptyString(message, 'Stash message');
  await createStash(gitRootPath, stashMessage);
  return { success: true };
};

const handleListStashes = async (event, { collectionPath } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  return { stashes: await listStashes(gitRootPath) };
};

const handleApplyStash = async (event, { collectionPath, stashIndex } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  await applyStash(gitRootPath, requireStashIndex(stashIndex));
  return { success: true };
};

const handleDropStash = async (event, { collectionPath, stashIndex } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  await dropStash(gitRootPath, requireStashIndex(stashIndex));
  return { success: true };
};

/**
 * Pull, used by the merge-conflict screen as the "resolve by taking the remote"
 * action. `--ff-only` is the safe default: it refuses rather than creating an
 * unexpected merge commit. The caller may opt into `--no-rebase` (merge).
 */
const handlePull = async (mainWindow, event, { collectionPath, processUid, remote, remoteBranch, strategy } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const remoteName = requireNonEmptyString(remote || 'origin', 'Remote').trim();
  if (remoteName.startsWith('-')) {
    throw new Error('Remote is not valid');
  }

  const branchName = requireBranchName(remoteBranch || (await getCurrentGitBranch(gitRootPath)));
  const pullStrategy = strategy || '--ff-only';

  await pullGitChanges(mainWindow, {
    gitRootPath,
    processUid,
    remote: remoteName,
    remoteBranch: branchName,
    strategy: pullStrategy
  });

  return { success: true, mergeInProgress: isMergeInProgress(gitRootPath) };
};

/**
 * Discard the local side of a conflicted merge: abort the merge if one is in
 * progress, then hard-reset the working tree back to HEAD. Destructive, so the
 * renderer must confirm before calling.
 */
const handleDiscardConflict = async (event, { collectionPath } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);

  if (isMergeInProgress(gitRootPath)) {
    const { abortConflictResolution } = require('../utils/git');
    await abortConflictResolution(gitRootPath);
    return { success: true, action: 'aborted-merge' };
  }

  await resetHardToHead(gitRootPath);
  return { success: true, action: 'reset-hard' };
};

/**
 * Create a new repository for a collection that is not tracked yet.
 *
 * `git init` runs in the collection directory itself, not in a parent, so the
 * collection becomes the repository root. `initGit` also renames the initial
 * branch to `main`.
 */
const handleInitRepo = async (event, { collectionPath, remoteUrl, branch } = {}) => {
  const targetPath = requireCollectionPath(collectionPath);

  // Already inside a repo: nothing to do, and re-initialising would nest one.
  const existingRoot = getCollectionGitRootPath(targetPath);
  if (existingRoot) {
    return { success: true, gitRootPath: existingRoot, alreadyInitialized: true };
  }

  await initGit(targetPath);

  // The cached "no repo" answer would otherwise survive until restart.
  invalidateCollectionGitRootPath(targetPath);

  const gitRootPath = resolveGitRootPath(targetPath);

  // Optional remote + branch, so a fresh repo can be pointed at its upstream in
  // the same step instead of leaving the user to run git by hand.
  const remote = typeof remoteUrl === 'string' ? remoteUrl.trim() : '';
  if (remote) {
    await addRemote({ gitRootPath, remoteName: 'origin', remoteUrl: remote });

    const targetBranch = typeof branch === 'string' ? branch.trim() : '';
    if (targetBranch) {
      // Track the remote branch without switching the working tree.
      await setUpstreamBranch(gitRootPath, 'main', targetBranch).catch(() => {});
    }
  }

  return { success: true, gitRootPath, alreadyInitialized: false };
};

/**
 * Set or clear the origin remote of an existing repository. An empty URL
 * removes it, which is how the Config tab lets a repo go local-only again.
 */
const handleSetRemote = async (event, { collectionPath, remoteUrl } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const url = typeof remoteUrl === 'string' ? remoteUrl.trim() : '';

  const remotes = await fetchRemotes(gitRootPath).catch(() => []);
  const hasOrigin = remotes.some((remote) => remote.name === 'origin');

  if (!url) {
    if (hasOrigin) {
      await removeRemote({ gitRootPath, remoteName: 'origin' });
    }
    return { success: true, remoteUrl: '' };
  }

  if (hasOrigin) {
    await setRemoteUrl(gitRootPath, 'origin', url);
  } else {
    await addRemote({ gitRootPath, remoteName: 'origin', remoteUrl: url });
  }

  return { success: true, remoteUrl: url };
};

/**
 * Remote list for the Config tab.
 */
const handleGetRemotes = async (event, { collectionPath } = {}) => {
  const gitRootPath = resolveGitRootPath(collectionPath);
  const remotes = await fetchRemotes(gitRootPath).catch(() => []);
  return {
    remotes: remotes.map((remote) => ({
      name: remote.name,
      url: remote.refs?.push || remote.refs?.fetch || ''
    }))
  };
};

/**
 * Delete the `.git` directory for a collection, turning it back into a plain
 * folder. Destructive: history, branches and stashes are gone.
 *
 * Only the repository root's `.git` is removed — never a parent repo's — so a
 * collection nested inside a larger repo cannot nuke that repo's history.
 */
const handleRemoveGitDir = async (event, { collectionPath } = {}) => {
  const targetPath = requireCollectionPath(collectionPath);
  const gitRootPath = resolveGitRootPath(targetPath);
  const gitDir = path.join(gitRootPath, '.git');

  if (!fs.existsSync(gitDir)) {
    throw new Error('No .git directory found for this collection');
  }

  // `removeDirectory` still calls the deprecated fs.rmdirSync({recursive}).
  // Use fs.rm here so deleting a repo does not add deprecation noise.
  await fs.promises.rm(gitDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  invalidateCollectionGitRootPath(targetPath);

  return { success: true };
};

const registerGitIpc = (mainWindow) => {
  ipcMain.handle('renderer:clone-git-repository', async (event, { url, path: targetPath, processUid, branch }) => {
    let directoryCreated = false;
    try {
      await createDirectory(targetPath);
      directoryCreated = true;
      await cloneGitRepository(mainWindow, { url, path: targetPath, processUid, branch });
      return 'Repository cloned successfully';
    } catch (error) {
      if (directoryCreated) {
        await removeDirectory(targetPath);
      }
      return Promise.reject(error);
    }
  });

  ipcMain.handle('renderer:get-collection-git-remote-url', (event, collectionPath) =>
    getCollectionGitRemoteUrl(collectionPath)
  );

  ipcMain.handle('renderer:list-remote-branches-for-url', handleListRemoteBranches);

  // Git panel: commit / stash / branch / conflict
  ipcMain.handle('renderer:git-get-data', handleGetCollectionGitData);
  ipcMain.handle('renderer:git-init', handleInitRepo);
  ipcMain.handle('renderer:git-remove-git-dir', handleRemoveGitDir);
  ipcMain.handle('renderer:git-set-remote', handleSetRemote);
  ipcMain.handle('renderer:git-get-remotes', handleGetRemotes);
  ipcMain.handle('renderer:git-get-status', handleGetStatus);
  ipcMain.handle('renderer:git-stage', handleStage);
  ipcMain.handle('renderer:git-unstage', handleUnstage);
  ipcMain.handle('renderer:git-discard', handleDiscard);
  ipcMain.handle('renderer:git-commit', handleCommit);
  ipcMain.handle('renderer:git-get-file-diff', handleGetFileDiff);
  ipcMain.handle('renderer:git-create-branch', (event, payload) => handleCreateBranch(mainWindow, event, payload));
  ipcMain.handle('renderer:git-checkout-branch', (event, payload) => handleCheckoutBranch(mainWindow, event, payload));
  ipcMain.handle('renderer:git-stash-create', handleCreateStash);
  ipcMain.handle('renderer:git-stash-list', handleListStashes);
  ipcMain.handle('renderer:git-stash-apply', handleApplyStash);
  ipcMain.handle('renderer:git-stash-drop', handleDropStash);
  ipcMain.handle('renderer:git-pull', (event, payload) => handlePull(mainWindow, event, payload));
  ipcMain.handle('renderer:git-discard-conflict', handleDiscardConflict);
};

module.exports = registerGitIpc;
module.exports.getCollectionGitRemoteUrl = getCollectionGitRemoteUrl;
module.exports.handleListRemoteBranches = handleListRemoteBranches;
module.exports.handleGetCollectionGitData = handleGetCollectionGitData;
module.exports.handleInitRepo = handleInitRepo;
module.exports.handleRemoveGitDir = handleRemoveGitDir;
module.exports.handleSetRemote = handleSetRemote;
module.exports.handleGetRemotes = handleGetRemotes;
module.exports.handleGetStatus = handleGetStatus;
module.exports.handleStage = handleStage;
module.exports.handleUnstage = handleUnstage;
module.exports.handleDiscard = handleDiscard;
module.exports.handleCommit = handleCommit;
module.exports.handleGetFileDiff = handleGetFileDiff;
module.exports.handleCreateBranch = handleCreateBranch;
module.exports.handleCheckoutBranch = handleCheckoutBranch;
module.exports.handleCreateStash = handleCreateStash;
module.exports.handleListStashes = handleListStashes;
module.exports.handleApplyStash = handleApplyStash;
module.exports.handleDropStash = handleDropStash;
module.exports.handlePull = handlePull;
module.exports.handleDiscardConflict = handleDiscardConflict;
module.exports.resolveRepoFilePath = resolveRepoFilePath;
module.exports.requireBranchName = requireBranchName;
