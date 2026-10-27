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
    preloadedState: repo
      ? { git: { repos: { [UID]: { isRepoResolved: true, ...repo } } } }
      : undefined
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

describe('GitTopBarButton', () => {
  it('shows the plain label when the collection is not a repo', async () => {
    await renderButton({ gitRootPath: null, currentBranch: '', branches: [] });

    expect(screen.getByTestId('git-topbar-btn')).toHaveTextContent('Git Plus');
  });

  it('appends the current branch once tracked', async () => {
    await renderButton({ gitRootPath: '/repo', currentBranch: 'main', branches: ['main', 'dev'] });

    expect(screen.getByTestId('git-topbar-btn')).toHaveTextContent('Git Plus - main');
  });

  it('shows the label without a branch when the branch is unknown', async () => {
    await renderButton({ gitRootPath: '/repo', currentBranch: '', branches: [] });

    expect(screen.getByTestId('git-topbar-btn')).toHaveTextContent('Git Plus');
  });

  it('opens the dropdown with the branch list', async () => {
    await renderButton({ gitRootPath: '/repo', currentBranch: 'main', branches: ['main', 'dev'] });

    fireEvent.click(screen.getByTestId('git-topbar-btn'));

    await waitFor(() => {
      expect(screen.getByText('dev')).toBeInTheDocument();
    });
  });

  it('switches branch through IPC', async () => {
    await renderButton({ gitRootPath: '/repo', currentBranch: 'main', branches: ['main', 'dev'] });

    fireEvent.click(screen.getByTestId('git-topbar-btn'));
    fireEvent.click(await screen.findByText('dev'));

    await waitFor(() => {
      expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-checkout-branch', {
        collectionPath: PATH,
        branchName: 'dev',
        processUid: undefined
      });
    });
  });

  it('resolves repo data on mount so the branch shows without opening the panel', async () => {
    await renderButton(null);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('renderer:git-get-data', { collectionPath: PATH });
  });
});
