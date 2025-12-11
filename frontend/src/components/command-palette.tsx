import { useEffect, useState } from 'react';

import { Button } from './ui/button';
import { Modal } from './ui/modal';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open command palette ⌘K
      </Button>
      <Modal title="Command palette" open={open} onClose={() => setOpen(false)}>
        <p>
          This is a stub for quick actions. Wire actions like “create task”, “jump to today”, or “log time”
          here.
        </p>
      </Modal>
    </>
  );
}
