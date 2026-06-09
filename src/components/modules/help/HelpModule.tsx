'use client'

import * as React from 'react'
import { useNavigationStore } from '@/lib/store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GettingStartedView } from './GettingStartedView'
import { KeyboardShortcutsView } from './KeyboardShortcutsView'
import { UserManualView } from './UserManualView'
import { FaqView } from './FaqView'
import { ContactSupportView } from './ContactSupportView'

const SUB_VIEWS: Record<string, React.ComponentType> = {
  'getting-started': GettingStartedView,
  'shortcuts': KeyboardShortcutsView,
  'manual': UserManualView,
  'faq': FaqView,
  'contact': ContactSupportView,
}

const SUB_LABELS: Record<string, string> = {
  'getting-started': 'Getting Started',
  'shortcuts': 'Keyboard Shortcuts',
  'manual': 'User Manual',
  'faq': 'FAQ',
  'contact': 'Contact Support',
}

export function HelpModule() {
  const { activeSubModule, setActiveSubModule } = useNavigationStore()
  const defaultTab = activeSubModule && SUB_LABELS[activeSubModule] ? activeSubModule : 'getting-started'

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 space-y-4 min-h-0 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help &amp; Support</h1>
        <p className="text-sm text-muted-foreground">Resources, guides, and support for Meridian PMS</p>
      </div>
      <Tabs value={defaultTab} onValueChange={setActiveSubModule}>
        <TabsList>
          {Object.entries(SUB_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-4">
          {Object.entries(SUB_VIEWS).map(([key, View]) => (
            <TabsContent key={key} value={key} className="mt-0">
              <View />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
