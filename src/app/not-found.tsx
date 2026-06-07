import { Building2 } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Building2 className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}
