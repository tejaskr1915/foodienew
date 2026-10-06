import React from 'react';
import Modal from './Modal';
import Button from './Button';

export const ConfirmModal = ({
  isOpen,
  title = "Confirm Action",
  message,
  onConfirm,
  onClose,
  confirmText = "Yes, Confirm",
  cancelText = "Cancel",
  loading = false
}) => {
  const footerActions = (
    <>
      <Button variant="light" onClick={onClose} disabled={loading}>
        {cancelText}
      </Button>
      <Button variant="danger" onClick={onConfirm} loading={loading}>
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose} footerActions={footerActions} size="sm">
      <p className="text-secondary small mb-0">{message}</p>
    </Modal>
  );
};
export default ConfirmModal;
