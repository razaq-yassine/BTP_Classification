import { createFileRoute } from '@tanstack/react-router'
import { SettingsUserDetail } from '@/features/settings/users/components/settings-user-detail'

export const Route = createFileRoute('/_authenticated/settings/users/$userId')({
  component: UserDetailPage,
})

function UserDetailPage() {
  const { userId } = Route.useParams()
  return <SettingsUserDetail userId={userId} />
}
