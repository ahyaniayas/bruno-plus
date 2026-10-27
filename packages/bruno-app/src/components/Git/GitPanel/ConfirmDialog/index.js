import React from 'react';
import Modal from 'components/Modal';

/**
 * Small confirmation dialog built on the shared Modal. Kept local to the Git
 * panel because the destructive-action copy differs per call site.
 */
const ConfirmDialog = ({ title, confirmText = 'Confirm', confirmButtonColor = 'danger', onConfirm, onCancel, children }) => (
  <Modal
    size="sm"
    title={title}
    confirmText={confirmText}
    cancelText="Cancel"
    confirmButtonColor={confirmButtonColor}
    handleConfirm={onConfirm}
    handleCancel={onCancel}
    dataTestId="git-confirm-dialog"
  >
    {children}
  </Modal>
);

export default ConfirmDialog;
