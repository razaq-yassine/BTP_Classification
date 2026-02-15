import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/profiles/$profileName')({
  component: ProfileLayout,
})

function ProfileLayout() {
  return <Outlet />
}
