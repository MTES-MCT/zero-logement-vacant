export interface Modal {
  open: () => void;
  close: () => void;
}

export const modal: Modal = { open: () => {}, close: () => {} };
