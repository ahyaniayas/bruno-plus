import reducer, {
  setRepoResolved,
  setRepoData,
  setRepoStatus,
  setStashes,
  setRepoLoading,
  setRepoError,
  clearRepo
} from './index';

const UID = 'collection-1';

const readRepo = (state) => state.repos[UID];

describe('git slice', () => {
  it('starts with no repos', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ repos: {} });
  });

  it('creates the repo entry on first write', () => {
    const state = reducer(undefined, setRepoLoading({ collectionUid: UID, isLoading: true }));

    expect(readRepo(state)).toBeDefined();
    expect(readRepo(state).isLoading).toBe(true);
  });

  describe('setRepoResolved', () => {
    it('records the repository root', () => {
      const state = reducer(undefined, setRepoResolved({ collectionUid: UID, gitRootPath: '/repo' }));

      expect(readRepo(state).gitRootPath).toBe('/repo');
      expect(readRepo(state).isRepoResolved).toBe(true);
    });

    it('records a null root for a non-repo collection', () => {
      const state = reducer(undefined, setRepoResolved({ collectionUid: UID, gitRootPath: null }));

      expect(readRepo(state).gitRootPath).toBeNull();
      expect(readRepo(state).isRepoResolved).toBe(true);
    });
  });

  describe('setRepoData', () => {
    it('stores branches, current branch and remote url', () => {
      const state = reducer(
        undefined,
        setRepoData({
          collectionUid: UID,
          currentBranch: 'dev',
          branches: ['main', 'dev'],
          remoteUrl: 'https://github.com/org/repo.git',
          mergeInProgress: false
        })
      );

      expect(readRepo(state)).toMatchObject({
        currentBranch: 'dev',
        branches: ['main', 'dev'],
        remoteUrl: 'https://github.com/org/repo.git',
        mergeInProgress: false
      });
    });

    it('defaults missing fields', () => {
      const state = reducer(undefined, setRepoData({ collectionUid: UID }));

      expect(readRepo(state)).toMatchObject({ currentBranch: '', branches: [], remoteUrl: '' });
    });
  });

  describe('setRepoStatus', () => {
    it('stores the three file groups', () => {
      const state = reducer(
        undefined,
        setRepoStatus({
          collectionUid: UID,
          staged: [{ path: 'a.bru' }],
          unstaged: [{ path: 'b.bru' }],
          conflicted: [{ path: 'c.bru' }],
          tooManyFiles: false,
          mergeInProgress: true,
          timestamp: 1234
        })
      );

      expect(readRepo(state).staged).toEqual([{ path: 'a.bru' }]);
      expect(readRepo(state).unstaged).toEqual([{ path: 'b.bru' }]);
      expect(readRepo(state).conflicted).toEqual([{ path: 'c.bru' }]);
      expect(readRepo(state).mergeInProgress).toBe(true);
      expect(readRepo(state).lastUpdatedAt).toBe(1234);
    });

    it('defaults missing file groups to empty arrays', () => {
      const state = reducer(undefined, setRepoStatus({ collectionUid: UID }));

      expect(readRepo(state).staged).toEqual([]);
      expect(readRepo(state).unstaged).toEqual([]);
      expect(readRepo(state).conflicted).toEqual([]);
    });

    it('leaves mergeInProgress untouched when the payload omits it', () => {
      let state = reducer(undefined, setRepoStatus({ collectionUid: UID, mergeInProgress: true }));
      state = reducer(state, setRepoStatus({ collectionUid: UID, staged: [] }));

      expect(readRepo(state).mergeInProgress).toBe(true);
    });
  });

  describe('setStashes', () => {
    it('stores the stash list', () => {
      const state = reducer(undefined, setStashes({ collectionUid: UID, stashes: [{ index: 0 }] }));

      expect(readRepo(state).stashes).toEqual([{ index: 0 }]);
    });

    it('defaults to an empty list', () => {
      const state = reducer(undefined, setStashes({ collectionUid: UID }));

      expect(readRepo(state).stashes).toEqual([]);
    });
  });

  describe('setRepoError', () => {
    it('stores and clears the error', () => {
      let state = reducer(undefined, setRepoError({ collectionUid: UID, error: 'boom' }));
      expect(readRepo(state).error).toBe('boom');

      state = reducer(state, setRepoError({ collectionUid: UID, error: null }));
      expect(readRepo(state).error).toBeNull();
    });
  });

  describe('clearRepo', () => {
    it('drops only the requested repo', () => {
      let state = reducer(undefined, setRepoLoading({ collectionUid: UID, isLoading: true }));
      state = reducer(state, setRepoLoading({ collectionUid: 'other', isLoading: true }));

      state = reducer(state, clearRepo(UID));

      expect(state.repos[UID]).toBeUndefined();
      expect(state.repos.other).toBeDefined();
    });
  });

  it('keeps collections independent', () => {
    let state = reducer(undefined, setRepoData({ collectionUid: UID, currentBranch: 'dev' }));
    state = reducer(state, setRepoData({ collectionUid: 'other', currentBranch: 'main' }));

    expect(state.repos[UID].currentBranch).toBe('dev');
    expect(state.repos.other.currentBranch).toBe('main');
  });
});
