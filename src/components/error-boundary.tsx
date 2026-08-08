'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

// ─── Global Error Boundary ─────────────────────────────────────
// Catches unhandled errors in the entire app.
// Shows a recovery UI instead of a blank white screen.

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GlobalErrorBoundary] Uncaught error:', error)
    console.error('[GlobalErrorBoundary] Component stack:', errorInfo.componentStack)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    // Clear auth state to start fresh
    try {
      localStorage.removeItem('meridian-auth')
    } catch { /* ignore */ }
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="size-7 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mt-1">
                An unexpected error occurred in the application.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="rounded-lg border bg-muted/50 p-3">
                  <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                    <Bug className="size-4" /> Error Details
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-48 whitespace-pre-wrap break-words text-destructive">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <div className="flex gap-3">
                <Button onClick={this.handleReload} className="flex-1" variant="default">
                  <RefreshCw className="size-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} className="flex-1" variant="outline">
                  <Home className="size-4 mr-2" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// ─── Module Error Boundary ─────────────────────────────────────
// Catches errors in individual modules (accounting, front-desk, etc.)
// so one broken module doesn't crash the entire app.

interface ModuleErrorBoundaryProps {
  moduleId: string
  moduleLabel: string
  children: React.ReactNode
}

interface ModuleErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ModuleErrorBoundary extends React.Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ModuleErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ModuleErrorBoundary] Error in module "${this.props.moduleId}":`, error)
    // Don't log full stack in production for security
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ModuleErrorBoundary] Stack:', errorInfo.componentStack)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Module Error</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The <strong>{this.props.moduleLabel}</strong> module encountered an error.
                </p>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="rounded-lg border bg-muted/50 p-3 text-left">
                  <summary className="cursor-pointer text-xs font-medium">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-32 whitespace-pre-wrap break-words text-destructive">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <Button onClick={this.handleRetry} variant="outline" size="sm">
                <RefreshCw className="size-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
