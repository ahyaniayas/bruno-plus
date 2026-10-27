import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { configureStore } from '@reduxjs/toolkit';
import gitReducer from 'providers/ReduxStore/slices/git';
import theme from 'themes/light/light';
import GitTopBarButton from './index';

jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const UID = 'col-1';
const PATH = '/repo/collection';

const renderButton = async (repo) => {
  const store = configureStore({
    reducer: { git: gitReducer },
    preloadedState: repo ? { git: { repos: { [UID]: { isRepoResolved: true, ...repo } } } } : undefined
  });

  const onOpenPanel = jest.fn();
  const result = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <GitTopBarButton collectionUid={UID} collectionPath={PATH} onOpenPanel={onOpenPanel} />
      </ThemeProvider>
    </Provider>
  );

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return { ...result, store, onOpenPanel };
};

const TRACKED = { gitRootPath: '/repo', currentBranch: 'main', branches: ['main', 'dev'] };

beforeEach(() => {
  window.ipcRenderer = {
    invoke: jest.fn((channel) => {
      if (channel === 'renderer:git-get-data') {
        return Promise.resolve({
          gitRootPath: '/repo',
          currentBranch: 'main',
          branches: ['main', 'dev'],
          remoteUrl: '',
          mergeInProgress: false
        });
      }
      if (channel === 'renderer:git-get-status') {
        return Promise.resolve({ staged: [], unstaged: [], conflicted: [], mergeInProgress: false });
      }
      if (channel === 'renderer:git-stash-list') {
        return Promise.resolve({ stashes: [] });
      }
      return Promise.resolve({ success: true });
    })
  };
});

describe('GitTopBarButton — two separate controls', () => {
  it('renders a label button and a separate caret button', async () => {
    await renderButton(TRACKED);

    expect(screen.getByTestId('git-topbar-open-btn')).toBeInTheDocument();
    expect(screen.getByTestId('git-topbar-caret-btn')).toBeInTheDocument();
  });

  it('opens the panel from the label button', async () => {
    const { onOpenPanel } = await renderButton(TRACKED);

    fireEvent.click(screen.getByTestId('git-topbar-open-btn'));

    expect(onOpenPanel).toHaveBeenCalledTimes(1);
  });

  it('does not open the panel from the caret button', async () => {
    const { onOpenPanel } = await renderButton(TRACKED);

    fireEvent.click(screen.getByTestId('git-topbar-caret-btn'));

    expect(onOpenPanel).not.toHaveBeenCalled();
  });
});

describe('GitTopBarButton — label', () => {
  it('shows the plain label when the collection is not a repo', async () => {
    await renderButton({ gitRootPath: null, currentBranch: '', branches: [] });

    expect(screen.getByTestId('git-topbar-open-btn')).toHaveTextContent('Git Plus');
  });

  it('appends the current branch once tracked', async () => {
    await renderButton(TRACKED);

    expect(screen.getByTestId('git-topbar-open-btn')).toHaveTextContent('Git Plus - main');
  });

  it('omits the branch suffix when the branch is unknown', async () => {
    await renderButton({ gitRootPath: '/repo', currentBranch: '', branches: [] });

    expect(screen.getByTestId('git-topbar-open-btn')).toHaveTextContent('Git Plus');
  });
});

describe('GitTopBarButton — menu', () => {
  it('lists branches in the dropdown', async () => {
    await renderButton(TRACKED);

    fireEvent.click(screen.getByTestId('git-topbar-caret-btn'));

    expect(await screen.findByText('dev')).toBeInTheDocument();
  });

  it('switches branch through IPC', async () => {
    await renderButton(TRACKED);

    fireEvent.click(screen.getByTestId('git-topbar-caret-btn'));
    fireEvent.click(await screen.findByText('dev'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-checkout-branch', {
        collectionPath: PATH,
        branchName: 'dev',
        processUid: undefined
      });
    });
  });

  it('offers Disconnect Git only for a tracked collection', async () => {
    await renderButton(TRACKED);

    fireEvent.click(screen.getByTestId('git-topbar-caret-btn'));

    expect(await screen.findByText('Disconnect Git')).toBeInTheDocument();
  });

  it('hides Disconnect Git when the collection is not a repo', async () => {
    await renderButton({ gitRootPath: null, currentBranch: '', branches: [] });

    fireEvent.click(screen.getByTestId('git-topbar-caret-btn'));

    // Wait for the menu to mount, then assert the repo-only action is absent.
    await waitFor(() => {
      expect(screen.queryByText('Disconnect Git')).not.toBeInTheDocument();
    });
  });

  it('does not offer Create branch in the menu', async () => {
    await renderButton(TRACKED);

    fireEvent.click(screen.getByTestId('git-topbar-caret-btn'));

    await screen.findByText('Disconnect Git');
    expect(screen.queryByText('Create branch…')).not.toBeInTheDocument();
  });

  it('resolves repo data on mount so the branch shows without opening the panel', async () => {
    await renderButton(null);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-get-data', { collectionPath: PATH });
  });
});

describe('GitTopBarButton — Disconnect Git', () => {
  const openDialog = async () => {
    fireEvent.click(screen.getByTestId('git-topbar-caret-btn'));
    fireEvent.click(await screen.findByText('Disconnect Git'));
    return screen.findByTestId('git-remove-dialog-body');
  };

  it('opens a confirmation dialog', async () => {
    await renderButton(TRACKED);

    expect(await openDialog()).toBeInTheDocument();
  });

  it('keeps the confirm button disabled until REMOVE GIT is typed', async () => {
    await renderButton(TRACKED);
    await openDialog();

    const confirmButton = screen.getByTestId('git-remove-dialog-submit-btn');
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByTestId('git-remove-confirm-input'), { target: { value: 'remove git' } });
    expect(screen.getByTestId('git-remove-dialog-submit-btn')).toBeDisabled();
  });

  it('enables the confirm button for the exact phrase', async () => {
    await renderButton(TRACKED);
    await openDialog();

    fireEvent.change(screen.getByTestId('git-remove-confirm-input'), { target: { value: 'REMOVE GIT' } });

    expect(screen.getByTestId('git-remove-dialog-submit-btn')).toBeEnabled();
  });

  it('removes the .git directory through IPC once confirmed', async () => {
    await renderButton(TRACKED);
    await openDialog();

    fireEvent.change(screen.getByTestId('git-remove-confirm-input'), { target: { value: 'REMOVE GIT' } });
    fireEvent.click(screen.getByTestId('git-remove-dialog-submit-btn'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-remove-git-dir', {
        collectionPath: PATH
      });
    });
  });
});
