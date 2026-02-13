import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/object-manager')({
  component: ObjectManagerLayout,
})

function ObjectManagerLayout() {
  return <Outlet />
}
