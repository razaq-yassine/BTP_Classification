import { Outlet } from '@tanstack/react-router'

export default function Settings() {
  return (
    <div className='flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-full'>
      <Outlet />
    </div>
  )
}
