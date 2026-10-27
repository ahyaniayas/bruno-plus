jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    promises: {
      ...actual.promises,
      rm: jest.fn()
    }
  };
});
jest.mock('../utils/git', () => ({
  cloneGitRepository: jest.fn(),
  getCollectionGitRepoUrl: jest.fn(),
  listBranchesForRemoteUrl: jest.fn(),
  getCollectionGitRootPath: jest.fn(),
  invalidateCollectionGitRootPath: jest.fn(),
  initGit: jest.fn(),
  addRemote: jest.fn(),
  removeRemote: jest.fn(),
  fetchRemotes: jest.fn(),
  getCollectionGitBranches: jest.fn(),
  getCurrentGitBranch: jest.fn(),
  getDefaultGitBranch: jest.fn(),
  getChangedFilesInCollectionGit: jest.fn(),
  stageChanges: jest.fn(),
  unstageChanges: jest.fn(),
  discardChanges: jest.fn(),
  commitChanges: jest.fn(),
  getStagedFileDiff: jest.fn(),
  getUnstagedFileDiff: jest.fn(),
  checkoutGitBranch: jest.fn(),
  createStash: jest.fn(),
  listStashes: jest.fn(),
  applyStash: jest.fn(),
  dropStash: jest.fn(),
  pullGitChanges: jest.fn(),
  resetHardToHead: jest.fn(),
  isMergeInProgress: jest.fn(),
  abortConflictResolution: jest.fn()
}));
jest.mock('../utils/filesystem', () => ({
  createDirectory: jest.fn(),
  removeDirectory: jest.fn()
}));

const fs = require('fs');
const path = require('path');
const gitUtils = require('../utils/git');
const fsUtils = require('../utils/filesystem');
const {
  getCollectionGitRemoteUrl,
  handleListRemoteBranches,
  handleGetCollectionGitData,
  handleInitRepo,
  handleRemoveGitDir,
  handleSetRemote,
  handleGetRemotes,
  handleGetStatus,
  handleStage,
  handleUnstage,
  handleDiscard,
  handleCommit,
  handleGetFileDiff,
  handleCreateBranch,
  handleCheckoutBranch,
  handleCreateStash,
  handleListStashes,
  handleApplyStash,
  handleDropStash,
  handlePull,
  handleDiscardConflict,
  resolveRepoFilePath,
  requireBranchName
} = require('./git');

const REPO = '/tmp/repo';
const COLLECTION = '/tmp/repo/collection';

describe('getCollectionGitRemoteUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the origin url for the collection path', async () => {
    gitUtils.getCollectionGitRepoUrl.mockResolvedValue('https://github.com/org/repo.git');

    expect(await getCollectionGitRemoteUrl('/tmp/repo/collection')).toBe('https://github.com/org/repo.git');
    expect(gitUtils.getCollectionGitRepoUrl).toHaveBeenCalledWith('/tmp/repo/collection');
  });

  it('maps an empty remote url to null', async () => {
    gitUtils.getCollectionGitRepoUrl.mockResolvedValue('');

    expect(await getCollectionGitRemoteUrl('/tmp/repo')).toBeNull();
  });

  it('returns null when the collection is not a git repo (lookup throws)', async () => {
    gitUtils.getCollectionGitRepoUrl.mockRejectedValue(new Error('not a git repository'));

    expect(await getCollectionGitRemoteUrl('/tmp/not-a-repo')).toBeNull();
  });
});

describe('handleListRemoteBranches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the branch listing for the url', async () => {
    gitUtils.listBranchesForRemoteUrl.mockResolvedValue({ branches: ['main'], defaultBranch: 'main' });

    const result = await handleListRemoteBranches(null, { url: 'https://github.com/org/repo.git' });

    expect(result).toEqual({ branches: ['main'], defaultBranch: 'main' });
    expect(gitUtils.listBranchesForRemoteUrl).toHaveBeenCalledWith({ url: 'https://github.com/org/repo.git' });
  });

  it('rejects a missing url', async () => {
    await expect(handleListRemoteBranches(null, { url: '   ' })).rejects.toThrow('Repository URL is required');
  });

  it('rejects a url that git would read as a command option', async () => {
    await expect(handleListRemoteBranches(null, { url: '--upload-pack=evil' })).rejects.toThrow(
      'Repository URL is not valid'
    );
  });
});

describe('resolveGitRootPath (via handlers)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a missing collection path', async () => {
    await expect(handleGetStatus(null, {})).rejects.toThrow('Collection path is required');
  });

  it('rejects a collection that is not in a git repo', async () => {
    gitUtils.getCollectionGitRootPath.mockReturnValue(null);

    await expect(handleGetStatus(null, { collectionPath: '/tmp/plain' })).rejects.toThrow(
      'Collection is not part of a git repository'
    );
  });

  it('derives the repo root from the collection path instead of trusting the caller', async () => {
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
    gitUtils.getChangedFilesInCollectionGit.mockResolvedValue({ staged: [], unstaged: [], conflicted: [] });
    gitUtils.isMergeInProgress.mockReturnValue(false);

    await handleGetStatus(null, { collectionPath: COLLECTION });

    expect(gitUtils.getCollectionGitRootPath).toHaveBeenCalledWith(COLLECTION);
    expect(gitUtils.getChangedFilesInCollectionGit).toHaveBeenCalledWith(REPO, COLLECTION);
  });
});

describe('resolveRepoFilePath', () => {
  it('resolves a repository-relative path to an absolute path', () => {
    expect(resolveRepoFilePath(REPO, 'collection/request.bru')).toBe(path.resolve(REPO, 'collection/request.bru'));
  });

  it('accepts an absolute path inside the repository', () => {
    const absolute = path.resolve(REPO, 'collection/request.bru');
    expect(resolveRepoFilePath(REPO, absolute)).toBe(absolute);
  });

  it('rejects a path that escapes the repository', () => {
    expect(() => resolveRepoFilePath(REPO, '../../etc/passwd')).toThrow('outside the repository');
  });

  it('rejects an absolute path outside the repository', () => {
    expect(() => resolveRepoFilePath(REPO, '/etc/passwd')).toThrow('outside the repository');
  });

  it('rejects the repository root itself', () => {
    expect(() => resolveRepoFilePath(REPO, '.')).toThrow('outside the repository');
  });

  it('rejects an empty path', () => {
    expect(() => resolveRepoFilePath(REPO, '  ')).toThrow('File path is required');
  });
});

describe('requireBranchName', () => {
  it('accepts a normal branch name', () => {
    expect(requireBranchName('feature/git-ui')).toBe('feature/git-ui');
  });

  it('trims surrounding whitespace', () => {
    expect(requireBranchName('  main  ')).toBe('main');
  });

  it('rejects a branch name git would read as an option', () => {
    expect(() => requireBranchName('-D')).toThrow('Branch name is not valid');
  });

  it.each(['a..b', 'has space', 'back\\slash', 'trailing/', 'tilde~1', 'caret^', 'colon:', 'star*', 'question?'])(
    'rejects the illegal ref name %s',
    (name) => {
      expect(() => requireBranchName(name)).toThrow('Branch name is not valid');
    }
  );

  it('rejects an empty branch name', () => {
    expect(() => requireBranchName('')).toThrow('Branch name is required');
  });
});

describe('handleGetCollectionGitData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('returns branches, current branch and remote url', async () => {
    gitUtils.getCollectionGitBranches.mockResolvedValue(['main', 'dev']);
    gitUtils.getCurrentGitBranch.mockResolvedValue('dev');
    gitUtils.getDefaultGitBranch.mockResolvedValue('main');
    gitUtils.getCollectionGitRepoUrl.mockResolvedValue('https://github.com/org/repo.git');
    gitUtils.isMergeInProgress.mockReturnValue(false);

    expect(await handleGetCollectionGitData(null, { collectionPath: COLLECTION })).toEqual({
      gitRootPath: REPO,
      branches: ['main', 'dev'],
      currentBranch: 'dev',
      remoteUrl: 'https://github.com/org/repo.git',
      mergeInProgress: false
    });
  });

  it('still returns branch data for a repo without an origin remote', async () => {
    gitUtils.getCollectionGitBranches.mockResolvedValue(['main']);
    gitUtils.getCurrentGitBranch.mockResolvedValue('main');
    gitUtils.getDefaultGitBranch.mockResolvedValue('main');
    gitUtils.getCollectionGitRepoUrl.mockRejectedValue(new Error('No such remote origin'));
    gitUtils.isMergeInProgress.mockReturnValue(false);

    const result = await handleGetCollectionGitData(null, { collectionPath: COLLECTION });

    expect(result.branches).toEqual(['main']);
    expect(result.remoteUrl).toBe('');
  });

  it('falls back to the symbolic ref for a freshly initialised repo', async () => {
    // No commits yet: branchLocal is empty but HEAD already points at main.
    gitUtils.getCollectionGitBranches.mockResolvedValue([]);
    gitUtils.getCurrentGitBranch.mockResolvedValue('');
    gitUtils.getDefaultGitBranch.mockResolvedValue('main');
    gitUtils.getCollectionGitRepoUrl.mockRejectedValue(new Error('No such remote origin'));
    gitUtils.isMergeInProgress.mockReturnValue(false);

    const result = await handleGetCollectionGitData(null, { collectionPath: COLLECTION });

    expect(result.currentBranch).toBe('main');
    expect(result.branches).toEqual(['main']);
  });
});

describe('handleInitRepo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initialises the repository in the collection directory', async () => {
    gitUtils.getCollectionGitRootPath.mockReturnValueOnce(null).mockReturnValue(REPO);

    const result = await handleInitRepo(null, { collectionPath: COLLECTION });

    expect(gitUtils.initGit).toHaveBeenCalledWith(COLLECTION);
    expect(result).toEqual({ success: true, gitRootPath: REPO, alreadyInitialized: false });
  });

  it('drops the cached "not a repo" lookup so the panel re-resolves', async () => {
    gitUtils.getCollectionGitRootPath.mockReturnValueOnce(null).mockReturnValue(REPO);

    await handleInitRepo(null, { collectionPath: COLLECTION });

    expect(gitUtils.invalidateCollectionGitRootPath).toHaveBeenCalledWith(COLLECTION);
  });

  it('is a no-op when the collection is already in a repository', async () => {
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);

    const result = await handleInitRepo(null, { collectionPath: COLLECTION });

    expect(gitUtils.initGit).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, gitRootPath: REPO, alreadyInitialized: true });
  });

  it('rejects a missing collection path', async () => {
    await expect(handleInitRepo(null, {})).rejects.toThrow('Collection path is required');
    expect(gitUtils.initGit).not.toHaveBeenCalled();
  });

  it('fails loudly when the repository still cannot be resolved after init', async () => {
    gitUtils.getCollectionGitRootPath.mockReturnValue(null);

    await expect(handleInitRepo(null, { collectionPath: COLLECTION })).rejects.toThrow(
      'Collection is not part of a git repository'
    );
  });
});

describe('handleRemoveGitDir', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('deletes the repository .git directory', async () => {
    fs.existsSync.mockReturnValue(true);

    const result = await handleRemoveGitDir(null, { collectionPath: COLLECTION });

    expect(fs.promises.rm).toHaveBeenCalledWith(path.join(REPO, '.git'), expect.objectContaining({ recursive: true }));
    expect(result).toEqual({ success: true });
  });

  it('invalidates the cached root so the panel flips back to the init state', async () => {
    fs.existsSync.mockReturnValue(true);

    await handleRemoveGitDir(null, { collectionPath: COLLECTION });

    expect(gitUtils.invalidateCollectionGitRootPath).toHaveBeenCalledWith(COLLECTION);
  });

  it('refuses when the collection is not a repo', async () => {
    gitUtils.getCollectionGitRootPath.mockReturnValue(null);

    await expect(handleRemoveGitDir(null, { collectionPath: COLLECTION })).rejects.toThrow(
      'Collection is not part of a git repository'
    );
    expect(fs.promises.rm).not.toHaveBeenCalled();
  });

  it('refuses when there is no .git directory on disk', async () => {
    fs.existsSync.mockReturnValue(false);

    await expect(handleRemoveGitDir(null, { collectionPath: COLLECTION })).rejects.toThrow(
      'No .git directory found for this collection'
    );
    expect(fs.promises.rm).not.toHaveBeenCalled();
  });

  it('rejects a missing collection path', async () => {
    await expect(handleRemoveGitDir(null, {})).rejects.toThrow('Collection path is required');
  });
});

describe('handleSetRemote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('adds origin when none exists', async () => {
    gitUtils.fetchRemotes.mockResolvedValue([]);

    const result = await handleSetRemote(null, {
      collectionPath: COLLECTION,
      remoteUrl: 'https://github.com/org/repo.git'
    });

    expect(gitUtils.addRemote).toHaveBeenCalledWith({
      gitRootPath: REPO,
      remoteName: 'origin',
      remoteUrl: 'https://github.com/org/repo.git'
    });
    expect(result).toEqual({ success: true, remoteUrl: 'https://github.com/org/repo.git' });
  });

  it('removes origin when the url is cleared', async () => {
    gitUtils.fetchRemotes.mockResolvedValue([{ name: 'origin' }]);

    const result = await handleSetRemote(null, { collectionPath: COLLECTION, remoteUrl: '' });

    expect(gitUtils.removeRemote).toHaveBeenCalledWith({ gitRootPath: REPO, remoteName: 'origin' });
    expect(gitUtils.addRemote).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, remoteUrl: '' });
  });

  it('is a no-op when clearing a remote that does not exist', async () => {
    gitUtils.fetchRemotes.mockResolvedValue([]);

    await handleSetRemote(null, { collectionPath: COLLECTION, remoteUrl: '' });

    expect(gitUtils.removeRemote).not.toHaveBeenCalled();
  });

  it('rejects a collection that is not a repo', async () => {
    gitUtils.getCollectionGitRootPath.mockReturnValue(null);

    await expect(
      handleSetRemote(null, { collectionPath: COLLECTION, remoteUrl: 'https://x/y.git' })
    ).rejects.toThrow('Collection is not part of a git repository');
  });
});

describe('handleGetRemotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('maps remotes to name and url', async () => {
    gitUtils.fetchRemotes.mockResolvedValue([
      { name: 'origin', refs: { push: 'https://github.com/org/repo.git', fetch: 'https://github.com/org/repo.git' } }
    ]);

    expect(await handleGetRemotes(null, { collectionPath: COLLECTION })).toEqual({
      remotes: [{ name: 'origin', url: 'https://github.com/org/repo.git' }]
    });
  });

  it('returns an empty list when there are no remotes', async () => {
    gitUtils.fetchRemotes.mockResolvedValue([]);

    expect(await handleGetRemotes(null, { collectionPath: COLLECTION })).toEqual({ remotes: [] });
  });
});

describe('handleGetStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('returns staged, unstaged and conflicted files', async () => {
    gitUtils.getChangedFilesInCollectionGit.mockResolvedValue({
      staged: [{ path: 'a.bru', type: 'staged' }],
      unstaged: [{ path: 'b.bru', type: 'unstaged' }],
      conflicted: [{ path: 'c.bru', type: 'conflicted' }],
      totalFiles: 3,
      tooManyFiles: false
    });
    gitUtils.isMergeInProgress.mockReturnValue(true);

    const result = await handleGetStatus(null, { collectionPath: COLLECTION });

    expect(result.staged).toHaveLength(1);
    expect(result.unstaged).toHaveLength(1);
    expect(result.conflicted).toHaveLength(1);
    expect(result.mergeInProgress).toBe(true);
  });

  it('defaults missing file groups to empty arrays', async () => {
    gitUtils.getChangedFilesInCollectionGit.mockResolvedValue({ totalFiles: 0 });
    gitUtils.isMergeInProgress.mockReturnValue(false);

    const result = await handleGetStatus(null, { collectionPath: COLLECTION });

    expect(result.staged).toEqual([]);
    expect(result.unstaged).toEqual([]);
    expect(result.conflicted).toEqual([]);
  });
});

describe('handleStage / handleUnstage / handleDiscard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('stages the requested files as absolute paths', async () => {
    await handleStage(null, { collectionPath: COLLECTION, filePaths: ['collection/a.bru'] });

    expect(gitUtils.stageChanges).toHaveBeenCalledWith(REPO, [path.resolve(REPO, 'collection/a.bru')]);
  });

  it('unstages the requested files as absolute paths', async () => {
    await handleUnstage(null, { collectionPath: COLLECTION, filePaths: ['collection/a.bru'] });

    expect(gitUtils.unstageChanges).toHaveBeenCalledWith(REPO, [path.resolve(REPO, 'collection/a.bru')]);
  });

  it('discards the requested files as absolute paths', async () => {
    gitUtils.discardChanges.mockResolvedValue({ trackedFilesDiscarded: 1, untrackedFilesDeleted: 0 });

    const result = await handleDiscard(null, { collectionPath: COLLECTION, filePaths: ['collection/a.bru'] });

    expect(gitUtils.discardChanges).toHaveBeenCalledWith(REPO, [path.resolve(REPO, 'collection/a.bru')]);
    expect(result).toMatchObject({ success: true, trackedFilesDiscarded: 1 });
  });

  it('refuses an empty file list', async () => {
    await expect(handleStage(null, { collectionPath: COLLECTION, filePaths: [] })).rejects.toThrow(
      'At least one file path is required'
    );
  });

  it('refuses to stage a file outside the repository', async () => {
    await expect(handleStage(null, { collectionPath: COLLECTION, filePaths: ['../../etc/passwd'] })).rejects.toThrow(
      'outside the repository'
    );
    expect(gitUtils.stageChanges).not.toHaveBeenCalled();
  });
});

describe('handleCommit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('commits with the given message', async () => {
    gitUtils.commitChanges.mockResolvedValue({ commit: 'abc123' });

    const result = await handleCommit(null, { collectionPath: COLLECTION, message: 'feat: add git panel' });

    expect(gitUtils.commitChanges).toHaveBeenCalledWith(REPO, 'feat: add git panel');
    expect(result).toEqual({ success: true, commit: 'abc123' });
  });

  it('refuses an empty commit message', async () => {
    await expect(handleCommit(null, { collectionPath: COLLECTION, message: '   ' })).rejects.toThrow(
      'Commit message is required'
    );
    expect(gitUtils.commitChanges).not.toHaveBeenCalled();
  });
});

describe('handleGetFileDiff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('reads the staged diff when staged is true', async () => {
    gitUtils.getStagedFileDiff.mockResolvedValue('diff --git a/a.bru b/a.bru');

    const result = await handleGetFileDiff(null, { collectionPath: COLLECTION, filePath: 'a.bru', staged: true });

    expect(gitUtils.getStagedFileDiff).toHaveBeenCalledWith(REPO, path.resolve(REPO, 'a.bru'));
    expect(result.diff).toContain('diff --git');
  });

  it('reads the unstaged diff by default', async () => {
    gitUtils.getUnstagedFileDiff.mockResolvedValue('');

    const result = await handleGetFileDiff(null, { collectionPath: COLLECTION, filePath: 'a.bru' });

    expect(gitUtils.getUnstagedFileDiff).toHaveBeenCalledWith(REPO, path.resolve(REPO, 'a.bru'));
    expect(result.diff).toBe('');
  });
});

describe('branch handlers', () => {
  const mainWindow = { webContents: { send: jest.fn() } };

  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('creates a branch through checkoutGitBranch with shouldCreate', async () => {
    const result = await handleCreateBranch(mainWindow, null, {
      collectionPath: COLLECTION,
      branchName: 'feature/new',
      processUid: 'p1'
    });

    expect(gitUtils.checkoutGitBranch).toHaveBeenCalledWith(mainWindow, {
      gitRootPath: REPO,
      branchName: 'feature/new',
      processUid: 'p1',
      shouldCreate: true
    });
    expect(result).toEqual({ success: true, branchName: 'feature/new' });
  });

  it('checks out an existing branch', async () => {
    await handleCheckoutBranch(mainWindow, null, { collectionPath: COLLECTION, branchName: 'dev' });

    expect(gitUtils.checkoutGitBranch).toHaveBeenCalledWith(mainWindow, {
      gitRootPath: REPO,
      branchName: 'dev',
      processUid: undefined
    });
  });

  it('refuses to create a branch with an illegal name', async () => {
    await expect(
      handleCreateBranch(mainWindow, null, { collectionPath: COLLECTION, branchName: '-D' })
    ).rejects.toThrow('Branch name is not valid');
    expect(gitUtils.checkoutGitBranch).not.toHaveBeenCalled();
  });
});

describe('stash handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('creates a stash with a message', async () => {
    await handleCreateStash(null, { collectionPath: COLLECTION, message: 'wip' });

    expect(gitUtils.createStash).toHaveBeenCalledWith(REPO, 'wip');
  });

  it('refuses an empty stash message', async () => {
    await expect(handleCreateStash(null, { collectionPath: COLLECTION, message: '' })).rejects.toThrow(
      'Stash message is required'
    );
  });

  it('lists stashes', async () => {
    gitUtils.listStashes.mockResolvedValue([{ index: 0, message: 'wip' }]);

    expect(await handleListStashes(null, { collectionPath: COLLECTION })).toEqual({
      stashes: [{ index: 0, message: 'wip' }]
    });
  });

  it('applies a stash by index', async () => {
    await handleApplyStash(null, { collectionPath: COLLECTION, stashIndex: 2 });

    expect(gitUtils.applyStash).toHaveBeenCalledWith(REPO, 2);
  });

  it('drops a stash by index', async () => {
    await handleDropStash(null, { collectionPath: COLLECTION, stashIndex: 0 });

    expect(gitUtils.dropStash).toHaveBeenCalledWith(REPO, 0);
  });

  it.each([-1, 1.5, '0', undefined, null])('refuses the invalid stash index %p', async (stashIndex) => {
    await expect(handleApplyStash(null, { collectionPath: COLLECTION, stashIndex })).rejects.toThrow(
      'Stash index is not valid'
    );
    expect(gitUtils.applyStash).not.toHaveBeenCalled();
  });
});

describe('handlePull', () => {
  const mainWindow = { webContents: { send: jest.fn() } };

  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
    gitUtils.isMergeInProgress.mockReturnValue(false);
  });

  it('pulls with --ff-only by default', async () => {
    const result = await handlePull(mainWindow, null, { collectionPath: COLLECTION, remoteBranch: 'main' });

    expect(gitUtils.pullGitChanges).toHaveBeenCalledWith(mainWindow, {
      gitRootPath: REPO,
      processUid: undefined,
      remote: 'origin',
      remoteBranch: 'main',
      strategy: '--ff-only'
    });
    expect(result).toEqual({ success: true, mergeInProgress: false });
  });

  it('falls back to the current branch when none is supplied', async () => {
    gitUtils.getCurrentGitBranch.mockResolvedValue('dev');

    await handlePull(mainWindow, null, { collectionPath: COLLECTION });

    expect(gitUtils.pullGitChanges).toHaveBeenCalledWith(
      mainWindow,
      expect.objectContaining({ remoteBranch: 'dev' })
    );
  });

  it('passes an explicit merge strategy through', async () => {
    await handlePull(mainWindow, null, { collectionPath: COLLECTION, remoteBranch: 'main', strategy: '--no-rebase' });

    expect(gitUtils.pullGitChanges).toHaveBeenCalledWith(
      mainWindow,
      expect.objectContaining({ strategy: '--no-rebase' })
    );
  });

  it('refuses a remote that git would read as an option', async () => {
    await expect(
      handlePull(mainWindow, null, { collectionPath: COLLECTION, remote: '--exec=evil', remoteBranch: 'main' })
    ).rejects.toThrow('Remote is not valid');
    expect(gitUtils.pullGitChanges).not.toHaveBeenCalled();
  });
});

describe('handleDiscardConflict', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gitUtils.getCollectionGitRootPath.mockReturnValue(REPO);
  });

  it('aborts the merge when one is in progress', async () => {
    gitUtils.isMergeInProgress.mockReturnValue(true);

    const result = await handleDiscardConflict(null, { collectionPath: COLLECTION });

    expect(gitUtils.abortConflictResolution).toHaveBeenCalledWith(REPO);
    expect(gitUtils.resetHardToHead).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, action: 'aborted-merge' });
  });

  it('hard-resets to HEAD when no merge is in progress', async () => {
    gitUtils.isMergeInProgress.mockReturnValue(false);

    const result = await handleDiscardConflict(null, { collectionPath: COLLECTION });

    expect(gitUtils.resetHardToHead).toHaveBeenCalledWith(REPO);
    expect(gitUtils.abortConflictResolution).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, action: 'reset-hard' });
  });
});
