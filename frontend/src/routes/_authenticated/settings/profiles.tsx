import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/profiles')({
  component: ProfilesLayout,
})

function ProfilesLayout() {
  return <Outlet />
}
