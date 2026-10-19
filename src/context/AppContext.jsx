import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const Ctx = createContext(null);
const KEY = 'sfc.session.v1';

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  });
  // Bump after any mutation so queries refetch.
  const [version, setVersion] = useState(0);

  const login = useCallback((org) => {
    localStorage.setItem(KEY, JSON.stringify(org));
    setSession(org);
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setSession(null);
  }, []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(() => ({ session, login, logout, version, bump }), [session, login, logout, version, bump]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
