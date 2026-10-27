import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { configureStore } from '@reduxjs/toolkit';
import gitReducer from 'providers/ReduxStore/slices/git';
import theme from 'themes/light/light';
import GitPanel from './index';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const UID = 'col-1';
const PATH = '/repo/collection';

const baseRepo = (overrides = {}) => ({
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
  ...overrides
});

let activeRepo = baseRepo();

const renderPanel = async (overrides = {}) => {
  const repo = baseRepo(overrides);
  activeRepo = repo;
  const store = configureStore({
    reducer: { git: gitReducer },
    preloadedState: { git: { repos: { [UID]: { isRepoResolved: true, ...repo } } } }
  });

  const result = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <GitPanel collectionUid={UID} collectionPath={PATH} />
      </ThemeProvider>
    </Provider>
  );

  await waitFor(() => {
    expect(window.ipcRenderer.invoke).toHaveBeenCalled();
  });

  return { ...result, store };
};

beforeEach(() => {
  window.ipcRenderer = {
    invoke: jest.fn((channel) => {
      if (channel === 'renderer:git-get-data') {
        return Promise.resolve({
          gitRootPath: activeRepo.gitRootPath,
          currentBranch: activeRepo.currentBranch,
          branches: activeRepo.branches,
          remoteUrl: activeRepo.remoteUrl,
          mergeInProgress: activeRepo.mergeInProgress
        });
      }
      if (channel === 'renderer:git-get-status') {
        return Promise.resolve({ staged: [], unstaged: [], conflicted: [], mergeInProgress: false });
      }
      if (channel === 'renderer:git-stash-list') {
        return Promise.resolve({ stashes: [] });
      }
      if (channel === 'renderer:git-get-remotes') {
        return Promise.resolve({
          remotes: [{ name: 'origin', url: 'https://github.com/org/repo.git' }]
        });
      }
      if (channel === 'renderer:git-pull') {
        return Promise.resolve({ success: true, mergeInProgress: false });
      }
      return Promise.resolve({ success: true });
    })
  };
});

describe('GitPanel — tabs', () => {
  it('renders Pull right after Changes', async () => {
    await renderPanel();

    const ids = screen.getAllByTestId(/^git-tab-/).map((el) => el.getAttribute('data-testid'));
    expect(ids).toEqual([
      'git-tab-changes',
      'git-tab-pull',
      'git-tab-stash',
      'git-tab-branch',
      'git-tab-config',
      'git-tab-conflict'
    ]);
  });

  it('clears the branch list when the repo disappears', async () => {
    // Regression: disconnect left the old branch list in the dropdown, so the
    // top bar still offered branches for a repo that no longer existed.
    const { store } = await renderPanel();

    expect(store.getState().git.repos[UID].branches).toEqual(['main', 'dev']);

    window.ipcRenderer.invoke = jest.fn(() => Promise.reject(new Error('not a git repository')));
    const { loadRepoData } = require('providers/ReduxStore/slices/git/actions');
    await store.dispatch(loadRepoData(UID, PATH));

    const repo = store.getState().git.repos[UID];
    expect(repo.gitRootPath).toBeNull();
    expect(repo.branches).toEqual([]);
    expect(repo.currentBranch).toBe('');
    expect(repo.remoteUrl).toBe('');
    expect(repo.staged).toEqual([]);
    expect(repo.stashes).toEqual([]);
  });
});

describe('GitPanel — Pull tab', () => {
  it('shows both strategies', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-pull'));

    expect(screen.getByTestId('git-pull-strategy---ff-only')).toBeInTheDocument();
    expect(screen.getByTestId('git-pull-strategy---no-rebase')).toBeInTheDocument();
  });

  it('pulls with fast-forward only by default', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-pull'));
    fireEvent.click(screen.getByTestId('git-pull-btn'));
    fireEvent.click(await screen.findByTestId('git-confirm-dialog-submit-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-pull', {
        collectionPath: PATH,
        remoteBranch: 'main',
        strategy: '--ff-only',
        processUid: undefined
      });
    });
  });

  it('uses the merge strategy when selected', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-pull'));
    fireEvent.click(screen.getByTestId('git-pull-strategy---no-rebase'));
    fireEvent.click(screen.getByTestId('git-pull-btn'));
    fireEvent.click(await screen.findByTestId('git-confirm-dialog-submit-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:git-pull',
        expect.objectContaining({ strategy: '--no-rebase' })
      );
    });
  });

  it('explains that pull needs a remote', async () => {
    await renderPanel({ remoteUrl: '' });

    fireEvent.click(screen.getByTestId('git-tab-pull'));

    expect(screen.getByTestId('git-pull-no-remote')).toBeInTheDocument();
  });
});

describe('GitPanel — Config tab', () => {
  it('loads the current origin remote', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-config'));

    await waitFor(() => {
      expect(screen.getByTestId('git-config-remote-input')).toHaveValue('https://github.com/org/repo.git');
    });
  });

  it('saves a new remote URL', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-config'));
    const input = await screen.findByTestId('git-config-remote-input');
    fireEvent.change(input, { target: { value: 'https://github.com/org/other.git' } });
    fireEvent.click(screen.getByTestId('git-config-submit-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-set-remote', {
        collectionPath: PATH,
        remoteUrl: 'https://github.com/org/other.git'
      });
    });
  });

  it('removes the remote when saved empty', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-config'));
    const input = await screen.findByTestId('git-config-remote-input');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('git-config-submit-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-set-remote', {
        collectionPath: PATH,
        remoteUrl: ''
      });
    });
  });
});
