import { Outlet } from '@tanstack/react-router'

export default function Settings() {
  return (
    <div className='flex-1 overflow-y-auto'>
      <Outlet />
    </div>
  )
}
