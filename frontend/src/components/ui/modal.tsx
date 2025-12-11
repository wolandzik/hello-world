import { ReactNode } from 'react';

import styles from './modal.module.css';

export type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

export function Modal({ title, open, onClose, children, actions }: ModalProps) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.label}>Command Palette</p>
            <h2 id="modal-title">{title}</h2>
          </div>
          {actions}
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
