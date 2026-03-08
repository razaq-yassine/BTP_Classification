import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dossiers')({
  component: DossiersLayout,
})

function DossiersLayout() {
  return <Outlet />
}
