import { InputHTMLAttributes } from 'react';

import styles from './input.module.css';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helper?: string;
};

export function Input({ label, helper, ...props }: InputProps) {
  return (
    <label className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <input className={styles.input} {...props} />
      {helper && <span className={styles.helper}>{helper}</span>}
    </label>
  );
}
