import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { configureStore } from '@reduxjs/toolkit';
import gitReducer from 'providers/ReduxStore/slices/git';
import theme from 'themes/light/light';
import GitPanel from './index';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const UID = 'col-1';
const PATH = '/repo/collection';

/**
 * The panel fetches its own state on mount, so the tests drive it through the
 * IPC mock rather than preloading the store. `currentRepo` is the single knob
 * each test turns.
 */
let currentRepo = {};

const defaultRepo = () => ({
  gitRootPath: '/repo',
  currentBranch: 'main',
  branches: ['main', 'dev'],
  remoteUrl: 'https://github.com/org/repo.git',
  mergeInProgress: false,
  staged: [],
  unstaged: [],
  conflicted: [],
  stashes: [],
  tooManyFiles: false,
  error: null,
  ...currentRepo
});

const renderPanel = async (overrides = {}) => {
  currentRepo = overrides;

  const store = configureStore({
    reducer: { git: gitReducer },
    preloadedState: {
      git: {
        repos: {
          [UID]: {
            gitRootPath: null,
            isRepoResolved: overrides.isRepoResolved === false ? false : true,
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
          }
        }
      }
    }
  });

  const result = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <GitPanel collectionUid={UID} collectionPath={PATH} />
      </ThemeProvider>
    </Provider>
  );

  // Let the mount-time refresh settle inside act().
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return { ...result, store };
};

beforeEach(() => {
  currentRepo = {};
  window.ipcRenderer = {
    invoke: jest.fn((channel) => {
      const repo = defaultRepo();
      if (channel === 'renderer:git-get-data') {
        if (repo.gitRootPath === null) {
          return Promise.reject(new Error('Collection is not part of a git repository'));
        }
        return Promise.resolve({
          gitRootPath: repo.gitRootPath,
          currentBranch: repo.currentBranch,
          branches: repo.branches,
          remoteUrl: repo.remoteUrl,
          mergeInProgress: repo.mergeInProgress
        });
      }
      if (channel === 'renderer:git-get-status') {
        return Promise.resolve({
          staged: repo.staged,
          unstaged: repo.unstaged,
          conflicted: repo.conflicted,
          tooManyFiles: repo.tooManyFiles,
          mergeInProgress: repo.mergeInProgress
        });
      }
      if (channel === 'renderer:git-stash-list') {
        return Promise.resolve({ stashes: repo.stashes });
      }
      if (channel === 'renderer:git-discard-conflict') {
        return Promise.resolve({ success: true, action: 'aborted-merge' });
      }
      if (channel === 'renderer:git-init') {
        return Promise.resolve({ success: true, gitRootPath: '/repo', alreadyInitialized: false });
      }
      if (channel === 'renderer:git-pull') {
        return Promise.resolve({ success: true, mergeInProgress: false });
      }
      return Promise.resolve({});
    })
  };
});

describe('GitPanel', () => {
  it('shows a loading state until the repo is resolved', async () => {
    // Keep the repo-data promise pending so the panel stays in its unresolved state.
    window.ipcRenderer.invoke = jest.fn(() => new Promise(() => {}));

    render(
      <Provider store={configureStore({ reducer: { git: gitReducer } })}>
        <ThemeProvider theme={theme}>
          <GitPanel collectionUid={UID} collectionPath={PATH} />
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('Checking repository…')).toBeInTheDocument();
  });

  it('offers to initialize a repository when the collection is not tracked', async () => {
    await renderPanel({ gitRootPath: null });

    expect(screen.getByTestId('git-init-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Initialize Git Repository')).toBeInTheDocument();
    expect(screen.getByTestId('git-init-btn')).toBeInTheDocument();
  });

  it('initializes the repository when the button is clicked', async () => {
    await renderPanel({ gitRootPath: null });

    fireEvent.click(screen.getByTestId('git-init-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-init', { collectionPath: PATH });
    });
  });

  it('shows the current branch and all four tabs', async () => {
    await renderPanel();

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByTestId('git-tab-changes')).toBeInTheDocument();
    expect(screen.getByTestId('git-tab-stash')).toBeInTheDocument();
    expect(screen.getByTestId('git-tab-branch')).toBeInTheDocument();
    expect(screen.getByTestId('git-tab-conflict')).toBeInTheDocument();
  });

  it('counts staged and unstaged files on the Changes tab', async () => {
    await renderPanel({ staged: [{ path: 'a.bru' }], unstaged: [{ path: 'b.bru' }] });

    expect(screen.getByTestId('git-tab-changes')).toHaveTextContent('2');
  });

  it('badges the number of conflicted files', async () => {
    await renderPanel({ conflicted: [{ path: 'a.bru' }] });

    expect(screen.getByTestId('git-tab-conflict')).toHaveTextContent('1');
  });

  it('refreshes git state on mount', async () => {
    await renderPanel();

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-get-data', { collectionPath: PATH });
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-get-status', { collectionPath: PATH });
  });

  it('switches to the Stash tab', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-stash'));

    expect(screen.getByTestId('git-stash-message')).toBeInTheDocument();
  });

  it('switches to the Branch tab and lists branches', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-branch'));

    expect(screen.getByTestId('git-current-branch')).toHaveTextContent('current');
    expect(screen.getAllByTestId('git-branch-row')).toHaveLength(2);
  });

  it('switches to the Merge tab and shows the Coming Soon block', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-conflict'));

    expect(screen.getByTestId('git-conflict-coming-soon')).toHaveTextContent('Coming soon');
  });
});

describe('GitPanel — Changes tab', () => {
  it('disables commit until a message is typed and files are staged', async () => {
    await renderPanel({ staged: [{ path: 'a.bru' }] });

    expect(screen.getByTestId('git-commit-btn')).toBeDisabled();

    fireEvent.change(screen.getByTestId('git-commit-message'), { target: { value: 'feat: thing' } });

    expect(screen.getByTestId('git-commit-btn')).toBeEnabled();
  });

  it('keeps commit disabled when nothing is staged', async () => {
    await renderPanel({ unstaged: [{ path: 'a.bru' }] });

    fireEvent.change(screen.getByTestId('git-commit-message'), { target: { value: 'feat: thing' } });

    expect(screen.getByTestId('git-commit-btn')).toBeDisabled();
  });

  it('reports a clean working tree', async () => {
    await renderPanel();

    expect(screen.getByText('Working tree clean — nothing to commit.')).toBeInTheDocument();
  });

  it('warns when there are too many changed files', async () => {
    await renderPanel({ tooManyFiles: true });

    expect(screen.getByText(/Too many changed files/)).toBeInTheDocument();
  });

  it('lists staged and unstaged files', async () => {
    await renderPanel({ staged: [{ path: 'collection/a.bru' }], unstaged: [{ path: 'collection/b.bru' }] });

    expect(screen.getAllByTestId('git-file-row')).toHaveLength(2);
  });

  it('stages a file through IPC', async () => {
    await renderPanel({ unstaged: [{ path: 'collection/a.bru', working_dir: 'M' }] });

    fireEvent.click(screen.getByTestId('git-stage-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-stage', {
        collectionPath: PATH,
        filePaths: ['collection/a.bru']
      });
    });
  });

  it('asks for confirmation before discarding', async () => {
    await renderPanel({ unstaged: [{ path: 'collection/a.bru', working_dir: 'M' }] });

    fireEvent.click(screen.getByTestId('git-discard-btn'));

    expect(await screen.findByTestId('git-confirm-dialog-submit-btn')).toBeInTheDocument();
  });

  it('commits with the typed message', async () => {
    await renderPanel({ staged: [{ path: 'collection/a.bru' }] });

    fireEvent.change(screen.getByTestId('git-commit-message'), { target: { value: 'feat: add panel' } });
    fireEvent.click(screen.getByTestId('git-commit-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-commit', {
        collectionPath: PATH,
        message: 'feat: add panel'
      });
    });
  });

  it('unstages every staged file at once', async () => {
    await renderPanel({
      staged: [{ path: 'collection/a.bru' }, { path: 'collection/b.bru' }]
    });

    fireEvent.click(screen.getByTestId('git-unstage-all-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-unstage', {
        collectionPath: PATH,
        filePaths: ['collection/a.bru', 'collection/b.bru']
      });
    });
  });

  it('stages every unstaged file at once', async () => {
    await renderPanel({
      unstaged: [{ path: 'collection/a.bru' }, { path: 'collection/b.bru' }]
    });

    fireEvent.click(screen.getByTestId('git-stage-all-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-stage', {
        collectionPath: PATH,
        filePaths: ['collection/a.bru', 'collection/b.bru']
      });
    });
  });
});

describe('GitPanel — Merge tab', () => {
  it('reports no conflicts when the tree is clean', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-conflict'));

    expect(screen.getByText('No conflicts. Nothing to resolve.')).toBeInTheDocument();
  });

  it('lists conflicted files and offers discard and pull', async () => {
    await renderPanel({ conflicted: [{ path: 'collection/a.bru' }], mergeInProgress: true });

    fireEvent.click(screen.getByTestId('git-tab-conflict'));

    expect(screen.getByTestId('git-conflict-row')).toBeInTheDocument();
    expect(screen.getByTestId('git-conflict-discard-btn')).toBeEnabled();
    expect(screen.getByTestId('git-conflict-pull-btn')).toBeEnabled();
  });

  it('disables pull when no remote is configured', async () => {
    await renderPanel({ conflicted: [{ path: 'a.bru' }], remoteUrl: '' });

    fireEvent.click(screen.getByTestId('git-tab-conflict'));

    expect(screen.getByTestId('git-conflict-pull-btn')).toBeDisabled();
    expect(screen.getByText(/No remote configured/)).toBeInTheDocument();
  });

  it('calls discard-conflict after confirmation', async () => {
    await renderPanel({ conflicted: [{ path: 'a.bru' }], mergeInProgress: true });

    fireEvent.click(screen.getByTestId('git-tab-conflict'));
    fireEvent.click(screen.getByTestId('git-conflict-discard-btn'));

    const confirmButton = await screen.findByTestId('git-confirm-dialog-submit-btn');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-discard-conflict', {
        collectionPath: PATH
      });
    });
  });

  it('calls pull with --ff-only after confirmation', async () => {
    await renderPanel({ conflicted: [{ path: 'a.bru' }], mergeInProgress: true });

    fireEvent.click(screen.getByTestId('git-tab-conflict'));
    fireEvent.click(screen.getByTestId('git-conflict-pull-btn'));

    const confirmButton = await screen.findByTestId('git-confirm-dialog-submit-btn');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:git-pull',
        expect.objectContaining({ collectionPath: PATH, remoteBranch: 'main', strategy: '--ff-only' })
      );
    });
  });
});

describe('GitPanel — Stash tab', () => {
  it('stashes changes with a message', async () => {
    await renderPanel({ unstaged: [{ path: 'collection/a.bru' }] });

    fireEvent.click(screen.getByTestId('git-tab-stash'));
    fireEvent.change(screen.getByTestId('git-stash-message'), { target: { value: 'wip' } });
    fireEvent.click(screen.getByTestId('git-stash-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-stash-create', {
        collectionPath: PATH,
        message: 'wip'
      });
    });
  });

  it('disables stash when there is nothing to stash', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-stash'));
    fireEvent.change(screen.getByTestId('git-stash-message'), { target: { value: 'wip' } });

    expect(screen.getByTestId('git-stash-btn')).toBeDisabled();
  });

  it('lists existing stashes', async () => {
    await renderPanel({ stashes: [{ index: 0, hash: 'abc', message: 'wip', filesChanged: 1 }] });

    fireEvent.click(screen.getByTestId('git-tab-stash'));

    expect(screen.getByTestId('git-stash-row')).toBeInTheDocument();
  });
});
