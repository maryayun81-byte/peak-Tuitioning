'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { User } from 'lucide-react'
import { CustomAvatar } from './CustomAvatar'
import { AvatarConfig, buildAvatarUrl } from '@/lib/avatars/avatarData'

interface AvatarProps {
  url?: string | null
  metadata?: AvatarConfig | string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  animate?: boolean
}

export const Avatar = ({ 
  url, 
  metadata,
  name, 
  size = 'md', 
  className = '',
  animate = false
}: AvatarProps) => {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [url, metadata])

  const isEmoji = (str: string) => {
    return /\p{Emoji}/u.test(str) && !str.includes('/') && !str.includes('.')
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-8 h-8 text-sm'
      case 'md': return 'w-12 h-12 text-base'
      case 'lg': return 'w-16 h-16 text-xl'
      case 'xl': return 'w-24 h-24 text-4xl'
      case '2xl': return 'w-32 h-32 text-6xl'
      default: return 'w-12 h-12 text-base'
    }
  }

  const getEmojiSize = () => {
    switch (size) {
      case 'sm': return '1.2rem'
      case 'md': return '1.8rem'
      case 'lg': return '2.5rem'
      case 'xl': return '4rem'
      case '2xl': return '5.5rem'
      default: return '1.8rem'
    }
  }

  const renderContent = () => {
    const isUrlInvalid = !url || url === 'null' || url === 'undefined' || url === ''
    const isMetadataInvalid = !metadata || metadata === 'null' || metadata === 'undefined' || metadata === '{}'

    if (!isMetadataInvalid && !imageFailed) {
      try {
        const config = typeof metadata === 'string' ? JSON.parse(metadata as string) : metadata
        if (config && Object.keys(config).length > 0) {
          const dicebearUrl = buildAvatarUrl(config)
          return (
            <img 
              src={dicebearUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
              loading="eager"
              onError={() => setImageFailed(true)}
            />
          )
        }
      } catch {
        // fall through to initials
      }
    }

    if (isUrlInvalid || imageFailed) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
          {name ? name[0].toUpperCase() : <User size={24} />}
        </div>
      )
    }

    if (isEmoji(url as string)) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-transparent" style={{ fontSize: getEmojiSize() }}>
          {url}
        </div>
      )
    }

    return (
      <img 
        src={url as string} 
        alt={name || 'Avatar'} 
        className="w-full h-full object-cover"
        onError={() => setImageFailed(true)}
      />
    )
  }

  const Container = animate ? motion.div : 'div'
  const animationProps = animate ? {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 }
  } : {}

  return (
    <Container 
      {...animationProps}
      className={`relative rounded-[1.5rem] overflow-hidden border-2 border-[var(--card-border)] bg-[var(--card)] shadow-lg ${getSizeClasses()} ${className}`}
    >
      {renderContent()}
    </Container>
  )
}
