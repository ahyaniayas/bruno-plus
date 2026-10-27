import { useSelector } from 'react-redux';
import { IconBrandGit } from '@tabler/icons';
import SidebarSection from 'components/Sidebar/SidebarSection';
import GitPanel from 'components/Git/GitPanel';
import { findCollectionByUid } from 'utils/collections/index';
import { selectCollections } from 'src/selectors/collections';

/**
 * Sidebar section hosting the Git panel.
 *
 * The panel needs a concrete collection, so the section follows the collection
 * that currently has a focused tab. When nothing is selected we show a hint
 * rather than an empty shell.
 */
const GitSection = () => {
  const collections = useSelector(selectCollections);
  const activeCollectionUid = useSelector((state) => {
    const activeTab = state.tabs.tabs.find((tab) => tab.uid === state.tabs.activeTabUid);
    return activeTab?.collectionUid || null;
  });

  const collection = activeCollectionUid ? findCollectionByUid(collections, activeCollectionUid) : null;

  return (
    <SidebarSection id="git" title="Git" icon={IconBrandGit} className="git-section">
      {collection ? (
        <GitPanel collectionUid={collection.uid} collectionPath={collection.pathname} />
      ) : (
        <div className="git-empty">Open a collection to see its git status.</div>
      )}
    </SidebarSection>
  );
};

export default GitSection;
