import { createContext, useContext, useEffect, useState } from 'react';

const NowCtx = createContext(Date.now());

// One shared 1-second ticker for every countdown on screen.
export function NowProvider({ children }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <NowCtx.Provider value={now}>{children}</NowCtx.Provider>;
}

export const useNow = () => useContext(NowCtx);
