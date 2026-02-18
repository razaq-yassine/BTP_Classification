import { Construction } from 'lucide-react'

interface UnderDevelopmentProps {
  title?: string
}

export default function UnderDevelopment({ title = 'This page' }: UnderDevelopmentProps) {
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <Construction className='h-16 w-16 text-muted-foreground' />
        <h1 className='text-4xl leading-tight font-bold'>Under Development</h1>
        <p className='text-muted-foreground text-center'>
          {title} is currently under development. <br />
          Check back soon!
        </p>
      </div>
    </div>
  )
}
