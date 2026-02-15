import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/profiles/$profileName/objects')({
  component: ObjectsLayout,
})

function ObjectsLayout() {
  return <Outlet />
}
