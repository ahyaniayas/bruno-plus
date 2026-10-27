import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import styled from 'styled-components';
import Modal from 'components/Modal';
import { removeGitDir } from 'providers/ReduxStore/slices/git/actions';

const CONFIRM_PHRASE = 'REMOVE GIT';

/**
 * The confirm input cannot rely on the app's generic text input styling: the
 * dark theme sets `input.bg` to transparent, which leaves the field light on a
 * dark modal. Use the modal's own surface tokens so it reads correctly in both
 * themes.
 */
const ConfirmInput = styled.input`
  width: 100%;
  padding: 6px 8px;
  font-size: ${(props) => props.theme.font.size.sm};
  font-family: inherit;
  color: ${(props) => props.theme.text};
  background: ${(props) => props.theme.modal.inputBg || props.theme.background.surface0};
  border: 1px solid ${(props) => props.theme.border.border2};
  border-radius: ${(props) => props.theme.border.radius.sm};
  outline: none;

  &::placeholder {
    color: ${(props) => props.theme.colors.text.subtext0};
  }

  &:focus {
    border-color: ${(props) => props.theme.primary.solid};
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const RemoveGitDirModal = ({ collectionUid, collectionPath, onClose }) => {
  const dispatch = useDispatch();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  const canConfirm = confirmation.trim() === CONFIRM_PHRASE && !busy;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await dispatch(removeGitDir(collectionUid, collectionPath));
      toast.success('Git disconnected — collection is no longer tracked');
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to disconnect Git');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      size="sm"
      title="Disconnect Git?"
      confirmText="Disconnect Git"
      confirmButtonColor="danger"
      confirmDisabled={!canConfirm}
      handleConfirm={handleConfirm}
      handleCancel={onClose}
      dataTestId="git-remove-dialog"
    >
      <div data-testid="git-remove-dialog-body">
        <p style={{ marginBottom: 10 }}>
          This deletes the <code>.git</code> folder from this collection. All commit history, branches, stashes and
          remote configuration will be permanently lost.
        </p>
        <p style={{ marginBottom: 10 }}>Your collection files stay on disk — only version control is removed.</p>
        <label htmlFor="git-remove-confirm" style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
          Type <strong>{CONFIRM_PHRASE}</strong> to confirm
        </label>
        <ConfirmInput
          id="git-remove-confirm"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={CONFIRM_PHRASE}
          autoComplete="off"
          disabled={busy}
          data-testid="git-remove-confirm-input"
        />
      </div>
    </Modal>
  );
};

export default RemoveGitDirModal;
