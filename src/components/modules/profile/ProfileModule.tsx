'use client'

import * as React from 'react'
import { apiFetch } from '@/lib/api'
import {
  UserCircle, Mail, Phone, Calendar, MapPin, Globe, CreditCard,
  Shield, Bell, History, Save, Upload, Eye, EyeOff, Lock,
  Monitor, CheckCircle2, XCircle, Clock,
  Building2, Briefcase, User, ChevronRight, AlertTriangle,
  LogOut, RefreshCw, Wifi,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore, usePreferencesStore } from '@/lib/store'
import { usePropertyStore } from '@/lib/store'
import { useSettingsStore } from '@/lib/store'

import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Helpers ────────────────────────────────────────────────────
// Local date formatters (en-GB / DD-MM-YYYY)
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr ?? ''
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return dateStr ?? ''
  }
}

const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr ?? ''
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr ?? ''
  }
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

// ─── Profile Module ────────────────────────────────────────────
export function ProfileModule() {
  const { user } = useAuthStore()
  const initials = user
    ? `${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}`
    : 'U'

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Page Header */}
      <div className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <Avatar className="h-14 w-14 border-2 border-violet-200 bg-violet-50">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.firstName} />
            <AvatarFallback className="bg-violet-100 text-violet-700 text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-violet-600" />
              My Profile
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage your personal information, security settings, and preferences
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-violet-200 bg-violet-50 text-violet-700">
            {(user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '') || 'Staff'}
          </Badge>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Tabs defaultValue="personal" className="w-full">
          <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 pt-2">
            <TabsList className="w-full justify-start overflow-x-auto h-auto gap-1 p-0 bg-transparent">
              <ProfileTabTrigger value="personal" icon={User} label="Personal Information" />
              <ProfileTabTrigger value="employment" icon={Briefcase} label="Employment Details" />
              <ProfileTabTrigger value="security" icon={Shield} label="Security" />
              <ProfileTabTrigger value="preferences" icon={Bell} label="Preferences" />
              <ProfileTabTrigger value="activity" icon={History} label="Activity Log" />
            </TabsList>
          </div>

          <div className="p-4 pb-16">
            <TabsContent value="personal" className="mt-0">
              <PersonalInfoTab />
            </TabsContent>
            <TabsContent value="employment" className="mt-0">
              <EmploymentDetailsTab />
            </TabsContent>
            <TabsContent value="security" className="mt-0">
              <SecurityTab />
            </TabsContent>
            <TabsContent value="preferences" className="mt-0">
              <PreferencesTab />
            </TabsContent>
            <TabsContent value="activity" className="mt-0">
              <ActivityLogTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Custom Tab Trigger ────────────────────────────────────────
function ProfileTabTrigger({
  value, icon: Icon, label,
}: { value: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  )
}

// ─── Info Row (read-only display) ───────────────────────────────
function InfoRow({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  color?: string
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50',
        color ?? 'text-violet-600',
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="text-sm font-medium truncate block">{value ?? '—'}</span>
      </div>
    </div>
  )
}

// ─── Tab 1: Personal Information ──────────────────────────────
function PersonalInfoTab() {
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()

  const [formData, setFormData] = React.useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    dateOfBirth: toDateInputValue(user?.dateOfBirth),
    gender: user?.gender ?? '',
    address: user?.address ?? '',
    city: user?.city ?? '',
    country: user?.country ?? '',
    nationality: user?.nationality ?? '',
    idType: user?.idType ?? '',
    idNumber: user?.idNumber ?? '',
  })

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const profileMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    },
    onSuccess: (_data, variables) => {
      // Only update fields that are actually present in variables (avoid setting undefined values)
      const updates: Record<string, unknown> = {}
      const fields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'address', 'city', 'country', 'nationality', 'idType', 'idNumber', 'avatarUrl', 'twoFactorEnabled']
      for (const field of fields) {
        if (variables[field] !== undefined) {
          updates[field] = variables[field]
        }
      }
      updateUser(updates)

      // Sync form data if profile fields were saved (not just avatar upload)
      if (variables.firstName !== undefined) {
        setFormData({
          firstName: variables.firstName as string,
          lastName: (variables.lastName as string) ?? formData.lastName,
          email: (variables.email as string) ?? formData.email,
          phone: (variables.phone as string) ?? formData.phone,
          dateOfBirth: (variables.dateOfBirth as string) ?? formData.dateOfBirth,
          gender: (variables.gender as string) ?? formData.gender,
          address: (variables.address as string) ?? formData.address,
          city: (variables.city as string) ?? formData.city,
          country: (variables.country as string) ?? formData.country,
          nationality: (variables.nationality as string) ?? formData.nationality,
          idType: (variables.idType as string) ?? formData.idType,
          idNumber: (variables.idNumber as string) ?? formData.idNumber,
        })
      }

      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      toast.success('Profile updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile')
    },
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    profileMutation.mutate(formData)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      profileMutation.mutate({ avatarUrl: dataUrl })
    }
    reader.readAsDataURL(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const initials = user
    ? `${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}`
    : 'U'

  return (
    <div className="space-y-4">
      {/* Avatar Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile Photo</CardTitle>
          <CardDescription>Your profile photo is displayed across the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-violet-200 bg-violet-50">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.firstName} />
              <AvatarFallback className="bg-violet-100 text-violet-700 text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={profileMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG or GIF. Max 2MB. Recommended 200×200px.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Basic Information</CardTitle>
          <CardDescription>Your personal and contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="name@hotel.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+977-98XXXXXXXX"
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleChange('gender', value)}
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
                placeholder="Nationality"
              />
            </div>
          </div>

          <Separator />

          <CardTitle className="text-sm pt-2">Identification</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="idType">ID Type</Label>
              <Select
                value={formData.idType}
                onValueChange={(value) => handleChange('idType', value)}
              >
                <SelectTrigger id="idType">
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="national-id">National ID</SelectItem>
                  <SelectItem value="citizenship">Citizenship Certificate</SelectItem>
                  <SelectItem value="license">Driver&apos;s License</SelectItem>
                  <SelectItem value="voter-id">Voter ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number</Label>
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => handleChange('idNumber', e.target.value)}
                placeholder="Enter ID number"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={profileMutation.isPending} className="min-w-[120px]">
              {profileMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 2: Employment Details ─────────────────────────────────
function EmploymentDetailsTab() {
  const { user } = useAuthStore()
  const { activeProperty } = usePropertyStore()
  const { settings } = useSettingsStore()

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      return apiFetch('/api/auth/profile')
    },
    enabled: !!user?.id,
  })

  const hireDate = profileData?.user?.hireDate

  return (
    <div className="space-y-4">
      {/* Employment Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Employment Information</CardTitle>
              <CardDescription>Your role and employment details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            <InfoRow icon={Building2} label="Department" value={user?.department ?? 'Management'} color="text-amber-600" />
            <InfoRow icon={User} label="Position" value={user?.position ?? 'Staff'} color="text-amber-600" />
            <InfoRow icon={Shield} label="Role / Access Level" value={(user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '') || 'Staff'} color="text-amber-600" />
            <InfoRow
              icon={Calendar}
              label="Hire Date"
              value={isLoading ? (
                <Skeleton className="h-4 w-36" />
              ) : (
                formatDate(hireDate)
              )}
              color="text-amber-600"
            />
            <InfoRow icon={CreditCard} label="Employee ID" value={`EMP-${user?.id?.slice(-6).toUpperCase() ?? '000000'}`} color="text-amber-600" />
            <InfoRow icon={ChevronRight} label="Reporting To" value="General Manager" color="text-amber-600" />
            <InfoRow icon={CheckCircle2} label="Work Status" value={
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </Badge>
            } color="text-amber-600" />
          </div>
        </CardContent>
      </Card>

      {/* Current Property */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Current Property</CardTitle>
              <CardDescription>Property you are currently assigned to</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            <InfoRow icon={Building2} label="Property Name" value={activeProperty?.name ?? '—'} color="text-teal-600" />
            <InfoRow icon={CreditCard} label="Property Code" value={activeProperty?.code ?? '—'} color="text-teal-600" />
            <InfoRow icon={MapPin} label="Location" value={activeProperty?.city ?? '—'} color="text-teal-600" />
            <InfoRow icon={Globe} label="Country" value={settings.country ?? 'Nepal'} color="text-teal-600" />
          </div>
        </CardContent>
      </Card>

      {/* Access Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Access Summary</CardTitle>
              <CardDescription>Modules accessible with your current role</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {user?.role === 'admin' ? (
              <>
                <AccessBadge label="All Modules" active />
                <AccessBadge label="System Settings" active />
                <AccessBadge label="User Management" active />
                <AccessBadge label="Financial Reports" active />
                <AccessBadge label="Data Export" active />
              </>
            ) : user?.role === 'manager' || user?.role === 'gm' ? (
              <>
                <AccessBadge label="Dashboard" active />
                <AccessBadge label="Front Desk" active />
                <AccessBadge label="Reservations" active />
                <AccessBadge label="Housekeeping" active />
                <AccessBadge label="POS" active />
                <AccessBadge label="Accounting" active />
                <AccessBadge label="Reports" active />
                <AccessBadge label="System Settings" active={user?.role === 'gm'} />
              </>
            ) : (
              <>
                <AccessBadge label="Dashboard" active />
                <AccessBadge label="Front Desk" active />
                <AccessBadge label="Reservations" active />
                <AccessBadge label="Housekeeping" active />
                <AccessBadge label="System Settings" />
                <AccessBadge label="User Management" />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AccessBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge
      variant={active ? 'default' : 'outline'}
      className={cn(
        active ? 'bg-violet-600 text-white hover:bg-violet-700' : 'text-muted-foreground',
      )}
    >
      {active ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
      {label}
    </Badge>
  )
}

// ─── Tab 3: Security ───────────────────────────────────────────
function SecurityTab() {
  const { user, updateUser, logout } = useAuthStore()
  const queryClient = useQueryClient()

  const [passwords, setPasswords] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = React.useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)

  const handlePasswordChange = (field: string, value: string) => {
    setPasswords((prev) => ({ ...prev, [field]: value }))
  }

  const toggleShowPassword = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleChangePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    if (passwords.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (passwords.currentPassword === passwords.newPassword) {
      toast.error('New password must be different from current password')
      return
    }

    setIsChangingPassword(true)
    try {
      await apiFetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      })
      toast.success('Password changed. Please sign in again.')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      // Server invalidates all sessions — log out locally
      setTimeout(() => logout(), 1500)
    } catch {
      toast.error('Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Two-Factor mutation
  const twoFactorMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, twoFactorEnabled: enabled }),
      })
    },
    onSuccess: (_data, enabled) => {
      updateUser({ twoFactorEnabled: enabled })
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      toast.success(enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update 2FA setting')
    },
  })

  const handleClearSessions = async () => {
    try {
      // Log activity
      await apiFetch('/api/auth/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Clear Sessions',
          module: 'Security',
          details: 'User cleared all sessions and logged out',
        }),
      })
      // Actually clear the session by logging out
      logout()
      toast.success('All sessions cleared. Please sign in again.')
    } catch {
      toast.error('Failed to clear sessions')
    }
  }

  return (
    <div className="space-y-4">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Change Password</CardTitle>
              <CardDescription>Update your account password regularly for security</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwords.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => toggleShowPassword('current')}
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwords.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => toggleShowPassword('new')}
              >
                {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwords.newPassword && passwords.newPassword.length < 8 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Password must be at least 8 characters
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwords.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => toggleShowPassword('confirm')}
              >
                {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Passwords do not match
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="min-w-[160px]"
            >
              {isChangingPassword ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Changing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Update Password
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Enable Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">
                {user?.twoFactorEnabled
                  ? 'Two-factor authentication is enabled for your account'
                  : 'Require a verification code in addition to your password'}
              </p>
            </div>
            <Switch
              checked={user?.twoFactorEnabled ?? false}
              disabled={twoFactorMutation.isPending}
              onCheckedChange={(checked) => {
                twoFactorMutation.mutate(checked)
              }}
            />
          </div>
          {user?.twoFactorEnabled && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-800 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Your account is protected with two-factor authentication.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Monitor className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Active Sessions</CardTitle>
              <CardDescription>Devices currently signed in to your account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current session */}
          <div className="flex items-center gap-3 rounded-lg border bg-emerald-50/50 p-2.5">
            <Monitor className="h-5 w-5 text-emerald-600" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Current Session</p>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-100 text-emerald-700 text-[10px]">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {user?.lastLoginAt
                  ? `Last active: ${formatDateTime(user.lastLoginAt)}`
                  : 'Currently active'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground whitespace-nowrap">Now</p>
          </div>

          {/* Clear other sessions button */}
          <div className="flex items-center justify-between rounded-lg border border-dashed p-2.5">
            <div className="space-y-0.5">
              <p className="text-sm font-medium flex items-center gap-2">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                Other Sessions
              </p>
              <p className="text-xs text-muted-foreground">
                This will sign you out from all devices. You will need to sign in again.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSessions}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out All Devices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Login Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Login Information</CardTitle>
              <CardDescription>Recent login activity</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            <InfoRow
              icon={Clock}
              label="Last Login"
              value={user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}
              color="text-slate-600"
            />
            <InfoRow
              icon={Monitor}
              label="Previous Login"
              value="Not tracked"
              color="text-slate-600"
            />
            <InfoRow
              icon={MapPin}
              label="Login IP Address"
              value="Not tracked"
              color="text-slate-600"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 4: Preferences ────────────────────────────────────────
function PreferencesTab() {
  const { preferences, updatePreferences } = usePreferencesStore()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch with next-themes
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Notification preferences from store
  const notifEmail = preferences.notifEmail
  const notifPush = preferences.notifPush
  const notifInApp = preferences.notifInApp

  const isDarkMode = mounted ? (resolvedTheme === 'dark') : false

  return (
    <div className="space-y-4">
      {/* Language & Region */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Language &amp; Region</CardTitle>
              <CardDescription>Customize display language and regional formats</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => {
                  updatePreferences({ language: value })
                  toast.success(`Language set to ${value === 'en' ? 'English' : 'Nepali'}`)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select
                value={preferences.dateFormat}
                onValueChange={(value) => {
                  updatePreferences({ dateFormat: value })
                  toast.success('Date format updated')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Currency Display</Label>
              <Select
                value={preferences.currency}
                onValueChange={(value) => {
                  updatePreferences({ currency: value })
                  toast.success('Currency preference updated')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NPR">NPR — Nepalese Rupee (रू)</SelectItem>
                  <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                  <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
                  <SelectItem value="GBP">GBP — British Pound (£)</SelectItem>
                  <SelectItem value="INR">INR — Indian Rupee (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={preferences.timezone}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">Timezone is set by system administrator</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Monitor className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the interface</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={(checked) => {
                setTheme(checked ? 'dark' : 'light')
                toast.success(checked ? 'Dark mode enabled' : 'Light mode enabled')
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Compact Mode</p>
              <p className="text-xs text-muted-foreground">
                Reduce spacing for more content on screen
              </p>
            </div>
            <Switch
              checked={preferences.compactMode}
              onCheckedChange={(checked) => {
                updatePreferences({ compactMode: checked })
                toast.success(checked ? 'Compact mode enabled' : 'Compact mode disabled')
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">
                Receive notifications via email for important events
              </p>
            </div>
            <Switch
              checked={notifEmail}
              onCheckedChange={(checked) => {
                updatePreferences({ notifEmail: checked })
                toast.success(checked ? 'Email notifications enabled' : 'Email notifications disabled')
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-xs text-muted-foreground">
                Get browser push notifications for real-time alerts
              </p>
            </div>
            <Switch
              checked={notifPush}
              onCheckedChange={(checked) => {
                updatePreferences({ notifPush: checked })
                toast.success(checked ? 'Push notifications enabled' : 'Push notifications disabled')
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">In-App Notifications</p>
              <p className="text-xs text-muted-foreground">
                Show notification badges and alerts within the app
              </p>
            </div>
            <Switch
              checked={notifInApp}
              onCheckedChange={(checked) => {
                updatePreferences({ notifInApp: checked })
                toast.success(checked ? 'In-app notifications enabled' : 'In-app notifications disabled')
              }}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Master Notification Toggle</p>
              <p className="text-xs text-muted-foreground">
                Disable all notifications at once
              </p>
            </div>
            <Switch
              checked={preferences.notifications}
              onCheckedChange={(checked) => {
                updatePreferences({ notifications: checked })
                toast.success(checked ? 'All notifications enabled' : 'All notifications disabled')
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab 5: Activity Log ──────────────────────────────────────
function getActionColor(action: string) {
  const colors: Record<string, string> = {
    Login: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Logout: 'border-slate-200 bg-slate-50 text-slate-700',
    Create: 'border-blue-200 bg-blue-50 text-blue-700',
    Update: 'border-amber-200 bg-amber-50 text-amber-700',
    View: 'border-slate-200 bg-slate-50 text-slate-700',
    Check: 'border-violet-200 bg-violet-50 text-violet-700',
    Post: 'border-orange-200 bg-orange-50 text-orange-700',
    Assign: 'border-teal-200 bg-teal-50 text-teal-700',
    Generate: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    Process: 'border-rose-200 bg-rose-50 text-rose-700',
    Export: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    Approve: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Shift: 'border-amber-200 bg-amber-50 text-amber-700',
    Clear: 'border-rose-200 bg-rose-50 text-rose-700',
  }
  const prefix = action.split(' ')[0]
  return colors[prefix] ?? colors[action] ?? 'border-slate-200 bg-slate-50 text-slate-700'
}

function getModuleBadgeColor(module: string) {
  const colors: Record<string, string> = {
    Auth: 'bg-slate-100 text-slate-700',
    Dashboard: 'bg-emerald-100 text-emerald-700',
    'Front Desk': 'bg-blue-100 text-blue-700',
    Accounting: 'bg-purple-100 text-purple-700',
    POS: 'bg-orange-100 text-orange-700',
    Housekeeping: 'bg-green-100 text-green-700',
    'Room Mgmt': 'bg-teal-100 text-teal-700',
    Settings: 'bg-slate-100 text-slate-700',
    Maintenance: 'bg-orange-100 text-orange-700',
    Reports: 'bg-violet-100 text-violet-700',
    Inventory: 'bg-cyan-100 text-cyan-700',
    Operations: 'bg-amber-100 text-amber-700',
    Security: 'bg-rose-100 text-rose-700',
  }
  return colors[module] ?? 'bg-slate-100 text-slate-700'
}

function ActivityLogTab() {
  const { user } = useAuthStore()
  const [filter, setFilter] = React.useState('all')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['activity-log', user?.id, filter],
    queryFn: async () => {
      if (!user?.id) return { logs: [], stats: { total: 0, logins: 0, today: 0 }, modules: [] }
      const params = new URLSearchParams({
        limit: '50',
        ...(filter !== 'all' ? { module: filter } : {}),
      })
      return apiFetch(`/api/auth/activity-log?${params}`)
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  })

  const logs = data?.logs ?? []
  const stats = data?.stats ?? { total: 0, logins: 0, today: 0 }
  const modules = data?.modules ?? []

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <History className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold">
                  {isLoading ? <Skeleton className="h-8 w-8 inline-block" /> : stats.total}
                </span>
                <p className="text-xs text-muted-foreground">Total Activities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold">
                  {isLoading ? <Skeleton className="h-8 w-8 inline-block" /> : stats.logins}
                </span>
                <p className="text-xs text-muted-foreground">Logins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold">
                  {isLoading ? <Skeleton className="h-8 w-8 inline-block" /> : stats.today}
                </span>
                <p className="text-xs text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <span className="text-lg font-bold">
                  {isLoading ? (
                    <Skeleton className="h-8 w-8 inline-block" />
                  ) : (
                    new Set(logs.map((l: { ipAddress?: string }) => l.ipAddress).filter(Boolean)).size
                  )}
                </span>
                <p className="text-xs text-muted-foreground">Unique IPs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm">Recent Activity</CardTitle>
              <CardDescription className="flex items-center gap-2">
                Last {logs.length} actions performed in the system
                {isFetching && !isLoading && (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                )}
              </CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {modules.map((m: string) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead className="w-[140px]">Action</TableHead>
                    <TableHead className="w-[120px]">Module</TableHead>
                    <TableHead className="hidden md:table-cell">Details</TableHead>
                    <TableHead className="w-[130px] text-right">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((entry: {
                    id: string
                    createdAt: string
                    action: string
                    module: string
                    details: string
                    ipAddress: string
                  }) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px] font-medium', getActionColor(entry.action))}>
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px]', getModuleBadgeColor(entry.module))}>
                          {entry.module}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[300px] hidden md:table-cell">
                        {entry.details}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right font-mono">
                        {entry.ipAddress ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No activities found for the selected filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
