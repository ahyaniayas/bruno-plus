import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { configureStore } from '@reduxjs/toolkit';
import gitReducer from 'providers/ReduxStore/slices/git';
import theme from 'themes/light/light';
import GitPanel from './index';
import { formatGitError, parseConflictingFilesFromError } from './utils';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const UID = 'col-1';
const PATH = '/repo/collection';

const baseRepo = (overrides = {}) => ({
  gitRootPath: '/repo',
  currentBranch: 'main',
  branches: ['main', 'dev'],
  remoteUrl: 'https://github.com/org/repo.git',
  mergeInProgress: false,
  ahead: 0,
  behind: 0,
  aheadCommits: [],
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
          mergeInProgress: activeRepo.mergeInProgress,
          ahead: activeRepo.ahead || 0,
          behind: activeRepo.behind || 0,
          aheadCommits: activeRepo.aheadCommits || []
        });
      }
      if (channel === 'renderer:git-get-status') {
        return Promise.resolve({
          staged: activeRepo.staged || [],
          unstaged: activeRepo.unstaged || [],
          conflicted: activeRepo.conflicted || [],
          mergeInProgress: activeRepo.mergeInProgress || false
        });
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
      if (channel === 'renderer:git-get-gitignore') {
        return Promise.resolve({ content: '# ignore\nnode_modules\n', exists: true, path: '/repo/.gitignore' });
      }
      if (channel === 'renderer:git-save-gitignore') {
        return Promise.resolve({ success: true });
      }
      if (channel === 'renderer:git-get-readme') {
        return Promise.resolve({
          content: '# Test Readme\n\nWelcome to docs.',
          exists: true,
          path: '/repo/README.md',
          filename: 'README.md'
        });
      }
      if (channel === 'renderer:git-save-readme') {
        return Promise.resolve({ success: true, path: '/repo/README.md', filename: 'README.md' });
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
      'git-tab-gitignore',
      'git-tab-readme',
      'git-tab-config'
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
  it('shows fast-forward only and the Coming Soon block', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-pull'));

    expect(screen.getByText(/Fast-forward only/)).toBeInTheDocument();
    expect(screen.getByTestId('git-conflict-coming-soon')).toBeInTheDocument();
    expect(screen.getByTestId('git-conflict-external-tip')).toBeInTheDocument();
    expect(screen.getByTestId('git-conflict-external-tip')).toHaveTextContent(/VS Code/);
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

  it('shows conflicted files and offers discard actions when conflicts exist', async () => {
    await renderPanel({ conflicted: [{ path: 'conflict.bru' }] });

    fireEvent.click(screen.getByTestId('git-tab-pull'));

    expect(screen.getByTestId('git-conflict-row')).toBeInTheDocument();
    expect(screen.getByTestId('git-conflict-discard-all-btn')).toBeInTheDocument();
  });

  it('explains that pull needs a remote', async () => {
    await renderPanel({ remoteUrl: '' });

    fireEvent.click(screen.getByTestId('git-tab-pull'));

    expect(screen.getByTestId('git-pull-no-remote')).toBeInTheDocument();
  });

  it('renders a single error card with details toggle on pull failure and does not leak to Changes tab', async () => {
    const originalInvoke = window.ipcRenderer.invoke.getMockImplementation();
    window.ipcRenderer.invoke.mockImplementation((channel, payload) => {
      if (channel === 'renderer:git-pull') {
        return Promise.reject(
          new Error(
            'Error invoking remote method \'renderer:git-pull\': Error: Updating d0ae7eb..0905ba2 From https://github.com/org/repo * branch main -> FETCH_HEAD error: Your local changes to the following files would be overwritten by merge: api/v1/auth/login.yml Please commit your changes or stash them before you merge. Aborting'
          )
        );
      }
      return originalInvoke(channel, payload);
    });

    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-pull'));
    fireEvent.click(screen.getByTestId('git-pull-btn'));
    fireEvent.click(await screen.findByTestId('git-confirm-dialog-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('git-pull-conflict-banner')).toBeInTheDocument();
      expect(document.querySelectorAll('.git-error')).toHaveLength(0);
      expect(document.querySelectorAll('.git-conflict-banner')).toHaveLength(1);
    });

    const detailsBtn = screen.getByTestId('git-error-details-btn');
    expect(detailsBtn).toHaveTextContent('Show details');
    fireEvent.click(detailsBtn);
    expect(screen.getByTestId('git-error-details-text')).toBeInTheDocument();
    expect(detailsBtn).toHaveTextContent('Hide details');

    // Switch to Changes tab: error must NOT leak into Changes tab
    fireEvent.click(screen.getByTestId('git-tab-changes'));
    expect(document.querySelectorAll('.git-error')).toHaveLength(0);
    expect(document.querySelectorAll('.git-conflict-banner')).toHaveLength(0);
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

  it('displays "Save Config" as submit button label', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-config'));
    expect(await screen.findByTestId('git-config-submit-btn')).toHaveTextContent('Save Config');
  });
});

describe('GitPanel — Changes tab push action', () => {
  it('does not render push button when there are no commits ahead', async () => {
    await renderPanel({ ahead: 0 });

    expect(screen.queryByTestId('git-push-btn')).not.toBeInTheDocument();
  });

  it('renders push button next to commit when commits exist', async () => {
    await renderPanel({ ahead: 1 });

    const pushBtn = screen.getByTestId('git-push-btn');
    expect(pushBtn).toBeInTheDocument();
    expect(pushBtn).toHaveTextContent('Push (1)');

    const commitBtn = screen.getByTestId('git-commit-btn');
    expect(commitBtn).toBeInTheDocument();
  });

  it('pushes commits to remote when clicked', async () => {
    await renderPanel({ ahead: 2, currentBranch: 'main', remoteUrl: 'https://github.com/org/repo.git' });

    const pushBtn = screen.getByTestId('git-push-btn');
    fireEvent.click(pushBtn);

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-push', {
        collectionPath: PATH,
        remoteBranch: 'main'
      });
    });
  });

  it('renders unpushed commits list with message, hash, and revert action', async () => {
    const unpushed = [
      {
        hash: 'c0ffee123456',
        message: 'feat: add auth login',
        author: 'Developer',
        time: 'just now'
      }
    ];

    await renderPanel({ ahead: 1, aheadCommits: unpushed });

    expect(screen.getByTestId('git-unpushed-commits-header')).toHaveTextContent('Unpushed Commits (1)');
    expect(screen.getByText('feat: add auth login')).toBeInTheDocument();
    expect(screen.getByText('c0ffee1')).toBeInTheDocument();
    expect(screen.getByTestId('git-revert-commit-btn')).toBeInTheDocument();
  });

  it('reverts unpushed commit by calling renderer:git-revert-commit with selected mode', async () => {
    const unpushed = [
      {
        hash: 'c0ffee123456',
        message: 'fix: broken auth token',
        author: 'Developer',
        time: 'just now'
      }
    ];

    await renderPanel({ ahead: 1, aheadCommits: unpushed });

    const revertBtn = screen.getByTestId('git-revert-commit-btn');
    fireEvent.click(revertBtn);

    // Confirmation dialog appears with options
    expect(screen.getAllByText(/Revert unpushed commit/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('git-revert-options')).toBeInTheDocument();
    expect(screen.getByText('Undo commit (Keep changes)')).toBeInTheDocument();

    // Default mode is undo
    const confirmBtn = await screen.findByTestId('git-confirm-dialog-submit-btn');
    expect(confirmBtn).toHaveTextContent('Undo commit');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-revert-commit', {
        collectionPath: PATH,
        commitHash: 'c0ffee123456',
        mode: 'undo'
      });
    });
  });

  it('supports selecting create revert commit mode', async () => {
    const unpushed = [
      {
        hash: 'a1b2c3d4e5f6',
        message: 'chore: update config',
        author: 'Developer',
        time: 'just now'
      }
    ];

    await renderPanel({ ahead: 1, aheadCommits: unpushed });

    fireEvent.click(screen.getByTestId('git-revert-commit-btn'));

    const revertRadio = screen.getByTestId('git-revert-mode-revert');
    fireEvent.click(revertRadio);

    const confirmBtn = await screen.findByTestId('git-confirm-dialog-submit-btn');
    expect(confirmBtn).toHaveTextContent('Create revert commit');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-revert-commit', {
        collectionPath: PATH,
        commitHash: 'a1b2c3d4e5f6',
        mode: 'revert'
      });
    });
  });
});

describe('GitPanel — Gitignore tab', () => {
  it('loads .gitignore content into the editor', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-gitignore'));

    await waitFor(() => {
      expect(screen.getByTestId('git-gitignore-tab')).toBeInTheDocument();
      expect(screen.getAllByText('.gitignore').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('gitignore-status-bar')).toBeInTheDocument();
    });
  });

  it('saves updated .gitignore content', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-gitignore'));

    await waitFor(() => {
      expect(screen.getByTestId('git-gitignore-tab')).toBeInTheDocument();
    });

    // In unit test environment, fallback textarea is rendered
    const textarea = screen.getByTestId('gitignore-editor-textarea');
    fireEvent.change(textarea, { target: { value: '# new ignore\n*.log\n' } });

    const saveBtn = screen.getByTestId('gitignore-save-btn');
    expect(saveBtn).toBeEnabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-save-gitignore', {
        collectionPath: PATH,
        content: '# new ignore\n*.log\n'
      });
    });
  });

  it('renders empty state with create button when .gitignore does not exist, and creates it', async () => {
    const originalInvoke = window.ipcRenderer.invoke.getMockImplementation();
    window.ipcRenderer.invoke.mockImplementation((channel, payload) => {
      if (channel === 'renderer:git-get-gitignore') {
        return Promise.resolve({ content: '', exists: false, path: '/repo/.gitignore' });
      }
      return originalInvoke(channel, payload);
    });

    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-gitignore'));

    await waitFor(() => {
      expect(screen.getByTestId('git-gitignore-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No .gitignore file')).toBeInTheDocument();
      expect(screen.getByTestId('git-create-gitignore-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('git-create-gitignore-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:git-save-gitignore',
        expect.objectContaining({ collectionPath: PATH, content: '' })
      );
      expect(screen.getByTestId('git-gitignore-tab')).toBeInTheDocument();
    });
  });
});

describe('GitPanel — Readme tab', () => {
  it('renders Readme tab in viewer mode by default', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-readme'));

    await waitFor(() => {
      expect(screen.getByTestId('git-readme-tab')).toBeInTheDocument();
      expect(screen.getByTestId('readme-rendered-content')).toBeInTheDocument();
      expect(screen.getByText('Test Readme')).toBeInTheDocument();
      expect(screen.getByTestId('readme-edit-btn')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });

  it('switches to editor mode when Edit is clicked and saves changes', async () => {
    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-readme'));

    await waitFor(() => {
      expect(screen.getByTestId('readme-edit-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('readme-edit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('readme-editor-textarea')).toBeInTheDocument();
      expect(screen.getByTestId('readme-preview-btn')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();
    });

    const textarea = screen.getByTestId('readme-editor-textarea');
    fireEvent.change(textarea, { target: { value: '# Updated Readme\n\nNew info here.' } });

    const saveBtn = screen.getByTestId('readme-save-btn');
    expect(saveBtn).toBeEnabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-save-readme', {
        collectionPath: PATH,
        content: '# Updated Readme\n\nNew info here.'
      });
    });

    // Toggle back to preview
    fireEvent.click(screen.getByTestId('readme-preview-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('readme-rendered-content')).toBeInTheDocument();
      expect(screen.getByText('Updated Readme')).toBeInTheDocument();
    });
  });

  it('renders empty state when README does not exist, and creates it', async () => {
    const originalInvoke = window.ipcRenderer.invoke.getMockImplementation();
    window.ipcRenderer.invoke.mockImplementation((channel, payload) => {
      if (channel === 'renderer:git-get-readme') {
        return Promise.resolve({ content: '', exists: false, path: '/repo/README.md', filename: 'README.md' });
      }
      return originalInvoke(channel, payload);
    });

    await renderPanel();

    fireEvent.click(screen.getByTestId('git-tab-readme'));

    await waitFor(() => {
      expect(screen.getByTestId('git-readme-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No README file')).toBeInTheDocument();
      expect(screen.getByTestId('git-create-readme-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('git-create-readme-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
        'renderer:git-save-readme',
        expect.objectContaining({ collectionPath: PATH })
      );
      expect(screen.getByTestId('git-readme-tab')).toBeInTheDocument();
    });
  });
});

describe('GitPanel — human-friendly Git error formatting', () => {
  const terminalSample
    = 'Error invoking remote method \'renderer:git-pull\': Error: Updating d0ae7eb..0905ba2 From https://github.com/solusi-integrasi-utama/tiketing-api-docs-bruno * branch main -> FETCH_HEAD error: Your local changes to the following files would be overwritten by merge: api/v1/auth/login.yml Please commit your changes or stash them before you merge. Aborting';

  it('parses conflicted file from raw terminal pull output', () => {
    const files = parseConflictingFilesFromError(terminalSample);
    expect(files).toEqual(['api/v1/auth/login.yml']);
  });

  it('parses untracked conflicted file and excludes advice text', () => {
    const untrackedError
      = 'error: The following untracked working tree files would be overwritten by merge:\n\t.gitignore\nPlease move or remove them before you merge.\nAborting';
    const files = parseConflictingFilesFromError(untrackedError);
    expect(files).toEqual(['.gitignore']);

    const formatted = formatGitError(untrackedError);
    expect(formatted).toBe(
      'Pull blocked: Untracked file ".gitignore" would be overwritten by incoming updates. Please move, remove, or discard it below.'
    );
  });

  it('formats terminal conflict error into a friendly message for regular users', () => {
    const formatted = formatGitError(terminalSample);
    expect(formatted).toBe(
      'Pull blocked: You have uncommitted local changes in "api/v1/auth/login.yml" that conflict with incoming updates. Please commit, stash, or discard your changes below.'
    );
  });

  it('formats multiple conflicting files cleanly', () => {
    const multiFileError
      = 'error: Your local changes to the following files would be overwritten by merge:\n\tfile1.yml\n\tfile2.bru\nPlease commit your changes or stash them before you merge.';
    const formatted = formatGitError(multiFileError);
    expect(formatted).toContain('Pull blocked: You have uncommitted local changes in 2 files (file1.yml, file2.bru)');
  });

  it('formats fast-forward divergence error', () => {
    const error = 'fatal: Not possible to fast-forward, aborting.';
    expect(formatGitError(error)).toBe(
      'Fast-forward pull not possible: Your branch and the remote branch have diverged with different commits.'
    );
  });

  it('formats authentication errors', () => {
    const error = 'fatal: Authentication failed for \'https://github.com/org/repo.git\'';
    expect(formatGitError(error)).toBe(
      'Authentication failed: Please check your repository credentials or access permissions.'
    );
  });

  it('formats network connectivity errors', () => {
    const error = 'fatal: Could not resolve host: github.com';
    expect(formatGitError(error)).toBe(
      'Network error: Unable to reach the remote repository. Please check your internet connection.'
    );
  });
});
