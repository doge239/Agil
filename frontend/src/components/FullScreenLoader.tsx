import { Spinner } from './Spinner'

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  )
}
