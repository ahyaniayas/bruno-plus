import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import GitConfigForm from 'components/Git/GitConfigForm';
import { getRemotes, setRemote } from 'providers/ReduxStore/slices/git/actions';

/**
 * Config tab: the same fields the Initialize Git form offers, but for a repo
 * that already exists. Saving with an empty URL removes the origin remote.
 */
const ConfigTab = ({ collectionUid, collectionPath, repo }) => {
  const dispatch = useDispatch();
  const [remoteUrl, setRemoteUrl] = useState(repo.remoteUrl || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    dispatch(getRemotes(collectionPath))
      .then((remotes) => {
        if (!active) return;
        const origin = remotes.find((remote) => remote.name === 'origin');
        setRemoteUrl(origin?.url || '');
      })
      .catch(() => null)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [collectionPath, dispatch]);

  const handleSubmit = async ({ remoteUrl: nextUrl }) => {
    setSaving(true);
    try {
      await dispatch(setRemote(collectionUid, collectionPath, nextUrl));
      setRemoteUrl(nextUrl);
      toast.success(nextUrl ? 'Remote saved' : 'Remote removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to save remote');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="git-spinner">Loading configuration…</div>;
  }

  return (
    <div className="git-split">
      {repo.error ? <div className="git-error">{repo.error}</div> : null}

      <div className="git-section-title">Repository</div>

      <div className="git-scroll" style={{ padding: '10px' }}>
        <div className="git-config-meta">
          <div className="git-row-sub">Branch: {repo.currentBranch || '—'}</div>
          <div className="git-row-sub">Repository: {repo.gitRootPath || '—'}</div>
        </div>

        <div className="git-section-title" style={{ padding: '10px 0 6px', background: 'transparent' }}>
          Remote
        </div>

        <GitConfigForm
          remoteUrl={remoteUrl}
          branch={repo.currentBranch || ''}
          submitLabel="Save remote"
          submitting={saving}
          onSubmit={handleSubmit}
          showBranchField={false}
          dataTestId="git-config-tab-form"
        />

        <div className="git-commit-hint" style={{ marginTop: 8 }}>
          Leave the URL empty and save to disconnect the remote while keeping local history.
        </div>
      </div>
    </div>
  );
};

export default ConfigTab;
