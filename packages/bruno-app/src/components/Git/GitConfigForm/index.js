import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconRefresh } from '@tabler/icons';
import Button from 'ui/Button';
import ActionIcon from 'ui/ActionIcon';
import { fetchBranchesForRepositoryUrl } from 'providers/ReduxStore/slices/collections/actions';

/**
 * Shared git configuration form.
 *
 * Used both by the Initialize Git empty state and the Config tab, so a repo can
 * be set up with a remote and an initial branch in one step — and edited later.
 *
 * The branch list is fetched from the remote URL; when it cannot be read (no
 * network, private repo) the field stays free-text so the user can type one.
 */
const GitConfigForm = ({
  remoteUrl: initialRemoteUrl = '',
  branch: initialBranch = '',
  submitLabel = 'Save',
  submitting = false,
  onSubmit,
  showBranchField = true,
  dataTestId = 'git-config-form'
}) => {
  const dispatch = useDispatch();
  const [remoteUrl, setRemoteUrl] = useState(initialRemoteUrl);
  const [branch, setBranch] = useState(initialBranch);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState('');

  useEffect(() => {
    setRemoteUrl(initialRemoteUrl || '');
  }, [initialRemoteUrl]);

  useEffect(() => {
    setBranch(initialBranch || '');
  }, [initialBranch]);

  const loadBranches = async () => {
    const url = remoteUrl.trim();
    if (!url) {
      setBranches([]);
      setBranchError('');
      return;
    }
    setLoadingBranches(true);
    setBranchError('');
    try {
      const listing = await dispatch(fetchBranchesForRepositoryUrl(url));
      const list = listing?.branches || [];
      setBranches(list);
      if (!branch && listing?.defaultBranch) {
        setBranch(listing.defaultBranch);
      }
    } catch (error) {
      // Private repos and typos both land here; a manual branch name still works.
      setBranches([]);
      setBranchError('Could not read branches from this URL — type a branch name instead.');
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitting) return;
    onSubmit?.({ remoteUrl: remoteUrl.trim(), branch: branch.trim() });
  };

  return (
    <form className="git-config-form" onSubmit={handleSubmit} data-testid={dataTestId}>
      <label className="git-config-label" htmlFor={`${dataTestId}-remote`}>
        Remote URL
      </label>
      <div className="git-config-row">
        <input
          id={`${dataTestId}-remote`}
          className="git-text-input"
          placeholder="https://github.com/org/repo.git"
          value={remoteUrl}
          onChange={(event) => setRemoteUrl(event.target.value)}
          disabled={submitting}
          data-testid="git-config-remote-input"
        />
        <ActionIcon
          label="Load branches from remote"
          onClick={loadBranches}
          disabled={submitting || loadingBranches}
          data-testid="git-config-load-branches-btn"
        >
          <IconRefresh size={13} strokeWidth={1.5} />
        </ActionIcon>
      </div>

      {showBranchField && (
        <>
          <label className="git-config-label" htmlFor={`${dataTestId}-branch`}>
            Branch
          </label>
          {branches.length > 0 ? (
            <select
              id={`${dataTestId}-branch`}
              className="git-text-input"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              disabled={submitting}
              data-testid="git-config-branch-select"
            >
              {!branch && <option value="">Select a branch</option>}
              {branches.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${dataTestId}-branch`}
              className="git-text-input"
              placeholder="main"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              disabled={submitting}
              data-testid="git-config-branch-input"
            />
          )}
          {branchError && (
            <div className="git-config-hint" data-testid="git-config-branch-error">
              {branchError}
            </div>
          )}
        </>
      )}

      <Button type="submit" size="sm" fullWidth loading={submitting} disabled={submitting} data-testid="git-config-submit-btn">
        {submitLabel}
      </Button>
    </form>
  );
};

export default GitConfigForm;
