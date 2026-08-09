'use client'

import * as React from 'react'
import { Camera, Check, User } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DEFAULT_AVATARS } from '@/lib/avatar-utils'

interface AvatarPickerProps {
  value: string
  onChange: (url: string) => void
  label?: string
}

export function AvatarPicker({ value, onChange, label }: AvatarPickerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      return
    }

    if (!file.type.startsWith('image/')) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      onChange(dataUrl)
    }
    reader.readAsDataURL(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium">{label}</p>
      )}

      {/* Current avatar preview */}
      {value && (
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16 border-2 border-emerald-200">
            <AvatarImage src={value} alt="Current avatar" />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg font-bold">
              <User className="size-6" />
            </AvatarFallback>
          </Avatar>
          <p className="text-xs text-muted-foreground">Current selection</p>
        </div>
      )}

      {/* Avatar grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {DEFAULT_AVATARS.map((avatar) => {
          const isSelected = value === avatar.url
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onChange(avatar.url)}
              className={
                'relative flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all '
                + (isSelected
                  ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-2 border-muted hover:border-emerald-300'
                )
              }
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={avatar.url} alt={avatar.label} />
                  <AvatarFallback className="bg-muted">
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
                {isSelected && (
                  <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center bg-emerald-500 border-0">
                    <Check className="size-3 text-white" />
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{avatar.label}</span>
            </button>
          )
        })}

        {/* Upload Custom */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={
            'relative flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all '
            + 'border-2 border-dashed border-muted hover:border-emerald-300 hover:bg-muted/50'
          }
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Camera className="size-5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground">Upload</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCustomUpload}
        />
      </div>
    </div>
  )
}