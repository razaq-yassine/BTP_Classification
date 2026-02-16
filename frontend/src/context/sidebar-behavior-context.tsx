import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

export type SidebarBehavior = 'hover' | 'locked'

const STORAGE_KEY = 'sidebar-behavior'

type SidebarBehaviorContextType = {
  sidebarBehavior: SidebarBehavior
  setSidebarBehavior: (behavior: SidebarBehavior) => void
}

const SidebarBehaviorContext = createContext<
  SidebarBehaviorContextType | undefined
>(undefined)

export function SidebarBehaviorProvider({ children }: { children: ReactNode }) {
  const [sidebarBehavior, _setSidebarBehavior] = useState<SidebarBehavior>(
    () =>
      (localStorage.getItem(STORAGE_KEY) as SidebarBehavior) || 'hover'
  )

  const setSidebarBehavior = useCallback((behavior: SidebarBehavior) => {
    localStorage.setItem(STORAGE_KEY, behavior)
    _setSidebarBehavior(behavior)
  }, [])

  return (
    <SidebarBehaviorContext.Provider
      value={{ sidebarBehavior, setSidebarBehavior }}
    >
      {children}
    </SidebarBehaviorContext.Provider>
  )
}

export function useSidebarBehavior() {
  const context = useContext(SidebarBehaviorContext)
  if (!context) {
    throw new Error(
      'useSidebarBehavior must be used within a SidebarBehaviorProvider'
    )
  }
  return context
}
