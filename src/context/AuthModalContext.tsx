import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AuthModalTab = 'login' | 'register';

export type AuthModalOpenOptions = {
  tab?: AuthModalTab;
  title?: string;
  description?: string;
  onAuthed?: () => void | Promise<void>;
};

type AuthModalContextValue = {
  open: (opts?: AuthModalOpenOptions) => void;
  close: () => void;
  isOpen: boolean;
  tab: AuthModalTab;
  title?: string;
  description?: string;
  onAuthed?: () => void | Promise<void>;
  setTab: (tab: AuthModalTab) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<AuthModalTab>('login');
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [onAuthed, setOnAuthed] = useState<
    (() => void | Promise<void>) | undefined
  >(undefined);

  const open = useCallback((opts?: AuthModalOpenOptions) => {
    setTab(opts?.tab ?? 'login');
    setTitle(opts?.title);
    setDescription(opts?.description);
    setOnAuthed(() => opts?.onAuthed);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTitle(undefined);
    setDescription(undefined);
    setOnAuthed(undefined);
    setTab('login');
  }, []);

  const value = useMemo<AuthModalContextValue>(
    () => ({
      open,
      close,
      isOpen,
      tab,
      title,
      description,
      onAuthed,
      setTab,
    }),
    [open, close, isOpen, tab, title, description, onAuthed],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return ctx;
}
