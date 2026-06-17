import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';

/**
 * A per-screen refresh bus. Data hooks register their `reload` function; the
 * screen's pull-to-refresh calls `refreshAll()`, which invokes every registered
 * reload and resolves when they all settle.
 *
 * Wrap a screen in <RefreshScope> and pass its `refreshAll` to <Screen onRefresh>.
 * Hooks below it call `useRefreshRegister(reload)` to participate.
 */
type Reload = () => Promise<unknown>;

interface RefreshBus {
  register: (fn: Reload) => () => void;
  refreshAll: () => Promise<void>;
}

const RefreshContext = createContext<RefreshBus | null>(null);

/** Provides a refresh bus to a screen subtree. Returns the bus via context. */
export function RefreshScope({ children }: { children: React.ReactNode }) {
  const fns = useRef(new Set<Reload>());

  const register = useCallback((fn: Reload) => {
    fns.current.add(fn);
    return () => {
      fns.current.delete(fn);
    };
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([...fns.current].map((fn) => Promise.resolve(fn()).catch(() => {})));
  }, []);

  const busRef = useRef<RefreshBus>({ register, refreshAll });
  return <RefreshContext.Provider value={busRef.current}>{children}</RefreshContext.Provider>;
}

/** Returns the screen's refresh bus, or null if not inside a RefreshScope. */
export function useRefreshBus(): RefreshBus | null {
  return useContext(RefreshContext);
}

/** Registers a hook's reload with the enclosing RefreshScope (no-op if absent). */
export function useRefreshRegister(reload: Reload): void {
  const bus = useContext(RefreshContext);
  useEffect(() => {
    if (!bus) return;
    return bus.register(reload);
  }, [bus, reload]);
}
