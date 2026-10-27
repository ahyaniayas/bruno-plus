import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  font-size: ${(props) => props.theme.font.size.sm};

  .git-panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    flex-shrink: 0;
  }

  .git-branch-name {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${(props) => props.theme.text};
  }

  .git-refresh {
    margin-left: auto;
  }

  .git-tabs {
    display: flex;
    gap: 2px;
    padding: 6px 8px 0;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    flex-shrink: 0;
  }

  .git-tab {
    padding: 4px 8px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.colors.text.subtext1};
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.sm};
    border-bottom: 2px solid transparent;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
      color: ${(props) => props.theme.text};
    }

    &.active {
      color: ${(props) => props.theme.text};
      border-bottom-color: ${(props) => props.theme.primary.solid};
    }
  }

  .git-tab-count {
    background: ${(props) => props.theme.background.surface2};
    border-radius: 8px;
    padding: 0 5px;
    font-size: 10px;
    line-height: 15px;
  }

  .git-tab-badge {
    background: ${(props) => props.theme.status.warning.background};
    color: ${(props) => props.theme.status.warning.text};
    border-radius: 8px;
    padding: 0 5px;
    font-size: 10px;
    line-height: 15px;
  }

  .git-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .git-split {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }

  .git-file-groups {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  .git-group-title {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.subtext1};
    background: ${(props) => props.theme.background.surface0};
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .git-file-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    cursor: pointer;
    border-left: 2px solid transparent;

    &:hover {
      background: ${(props) => props.theme.background.surface0};
    }

    &.selected {
      background: ${(props) => props.theme.background.surface1};
      border-left-color: ${(props) => props.theme.primary.solid};
    }
  }

  .git-file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    direction: rtl;
    text-align: left;
  }

  .git-file-dir {
    color: ${(props) => props.theme.colors.text.subtext1};
    font-size: 10px;
  }

  .git-file-status {
    font-family: var(--font-mono, monospace);
    font-size: 10px;
    font-weight: 600;
    width: 12px;
    text-align: center;
    flex-shrink: 0;
  }

  .git-file-status.modified {
    color: ${(props) => props.theme.status.warning.text};
  }

  .git-file-status.added {
    color: ${(props) => props.theme.status.success.text};
  }

  .git-file-status.deleted {
    color: ${(props) => props.theme.status.danger.text};
  }

  .git-file-status.conflicted {
    color: ${(props) => props.theme.status.danger.text};
  }

  .git-file-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    flex-shrink: 0;
  }

  .git-file-row:hover .git-file-actions,
  .git-file-row.selected .git-file-actions {
    opacity: 1;
  }

  .git-empty {
    padding: 16px 10px;
    color: ${(props) => props.theme.colors.text.subtext1};
    font-size: ${(props) => props.theme.font.size.sm};
    text-align: center;
  }

  .git-commit-box {
    flex-shrink: 0;
    border-top: 1px solid ${(props) => props.theme.border.border1};
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .git-commit-input {
    width: 100%;
    resize: vertical;
    min-height: 54px;
    max-height: 140px;
    padding: 6px 8px;
    font-size: ${(props) => props.theme.font.size.sm};
    font-family: inherit;
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.primary.solid};
    }

    &:disabled {
      opacity: 0.6;
    }
  }

  .git-commit-hint {
    font-size: 10px;
    color: ${(props) => props.theme.colors.text.subtext1};
  }

  .git-error {
    margin: 6px 10px;
    padding: 6px 8px;
    font-size: 11px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.status.danger.background};
    color: ${(props) => props.theme.status.danger.text};
    word-break: break-word;
  }

  .git-scroll {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  .git-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;

    &:hover {
      background: ${(props) => props.theme.background.surface0};
    }
  }

  .git-row-main {
    flex: 1;
    min-width: 0;
  }

  .git-row-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .git-row-sub {
    font-size: 10px;
    color: ${(props) => props.theme.colors.text.subtext1};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .git-inline-form {
    display: flex;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    flex-shrink: 0;
  }

  .git-text-input {
    flex: 1;
    min-width: 0;
    padding: 4px 8px;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.primary.solid};
    }
  }

  .git-current-badge {
    font-size: 10px;
    padding: 0 5px;
    border-radius: 8px;
    background: ${(props) => props.theme.status.success.background};
    color: ${(props) => props.theme.status.success.text};
    flex-shrink: 0;
  }

  .git-conflict-banner {
    margin: 8px 10px;
    padding: 8px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.status.danger.background};
    color: ${(props) => props.theme.status.danger.text};
    font-size: 11px;
    line-height: 1.5;
  }

  .git-conflict-actions {
    display: flex;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
    flex-shrink: 0;
  }

  .git-coming-soon {
    margin: 10px;
    padding: 10px;
    border: 1px dashed ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .git-coming-soon-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .git-coming-soon-badge {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 1px 5px;
    border-radius: 8px;
    background: ${(props) => props.theme.status.info.background};
    color: ${(props) => props.theme.status.info.text};
  }

  .git-coming-soon-list {
    margin: 6px 0 0;
    padding-left: 16px;
    color: ${(props) => props.theme.colors.text.subtext1};
    font-size: 11px;
    line-height: 1.6;
  }

  .git-section-title {
    padding: 6px 10px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.subtext1};
    background: ${(props) => props.theme.background.surface0};
  }

  .git-spinner {
    padding: 16px;
    text-align: center;
    color: ${(props) => props.theme.colors.text.subtext1};
    font-size: 11px;
  }

  .git-init-card {
    margin: 16px 10px;
    padding: 24px 16px;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .git-init-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(props) => props.theme.background.surface1};
    color: ${(props) => props.theme.text};
  }

  .git-init-title {
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 600;
    margin: 0;
    color: ${(props) => props.theme.text};
  }

  .git-init-description {
    margin: 0 0 4px;
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.subtext1};
    max-width: 260px;
  }

  .git-config-form {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    text-align: left;
  }

  .git-config-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.subtext1};
    margin-top: 4px;
  }

  .git-config-row {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .git-config-hint {
    font-size: 10px;
    color: ${(props) => props.theme.status.warning.text};
    line-height: 1.4;
  }

  .git-config-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 4px;
  }

  .git-pull-option {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 8px;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.sm};
    cursor: pointer;
    margin-bottom: 6px;

    &:hover {
      background: ${(props) => props.theme.background.surface0};
    }

    input {
      margin-top: 2px;
      accent-color: ${(props) => props.theme.primary.solid};
    }
  }

  .git-pull-option-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .git-pull-option-label {
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .git-pull-option-desc {
    font-size: 10px;
    line-height: 1.4;
    color: ${(props) => props.theme.colors.text.subtext1};
  }
`;

export default StyledWrapper;
