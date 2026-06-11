'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Users, Contact, Award, Megaphone } from 'lucide-react'
import { GuestProfilesView } from './GuestProfilesView'
import { LoyaltyView } from './LoyaltyView'
import { CampaignsView } from './CampaignsView'
import { useNavigationStore } from '@/lib/store'

const CRM_TABS = [
  { id: 'profiles', label: 'Guest Profiles', icon: Contact },
  { id: 'loyalty', label: 'Loyalty Program', icon: Award },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
]

export function CrmModule() {
  const { activeSubModule, navigateTo } = useNavigationStore()
  const initialTab = activeSubModule === 'loyalty' ? 'loyalty'
    : activeSubModule === 'campaigns' ? 'campaigns'
    : 'profiles'

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Guest CRM</h1>
          <p className="text-xs text-muted-foreground">
            Manage guest profiles, loyalty programs, and marketing campaigns
          </p>
        </div>
      </div>

      <Tabs
        defaultValue={initialTab}
        onValueChange={(v) => navigateTo('crm', v)}
        className="flex-1"
      >
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          {CRM_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profiles" className="mt-2">
          <GuestProfilesView />
        </TabsContent>
        <TabsContent value="loyalty" className="mt-2">
          <LoyaltyView />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-2">
          <CampaignsView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
