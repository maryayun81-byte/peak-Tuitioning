'use client'

import React from 'react'
import { AvatarConfig, buildAvatarUrl } from '@/lib/avatars/avatarData'

interface CustomAvatarProps {
  config: AvatarConfig
  size?: number | string
  className?: string
}

export const CustomAvatar = ({ config, size = 200, className = '' }: CustomAvatarProps) => {
  const url = buildAvatarUrl(config)
  return (
    <img
      src={url}
      alt="Custom Avatar"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', width: size, height: size }}
      loading="eager"
    />
  )
}
