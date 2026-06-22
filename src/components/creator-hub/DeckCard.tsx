import React from 'react'
import { Card } from '@/components/ui/Card'
import { MoreVertical, Play, Edit2, Share2, DownloadCloud, ShoppingCart, Users } from 'lucide-react'
import { Menu, Transition } from '@headlessui/react'

interface DeckCardProps {
  id: string
  title: string
  subject: string
  topic: string
  level: string
  cardCount: number
  thumbnailUrl?: string
  progressPercent?: number
  rating?: number
  price?: number
  isMarketplace?: boolean
  themeColor?: string
  onEdit?: () => void
  onStudy?: () => void
  onShare?: () => void
  onDownload?: () => void
  onSell?: () => void
  onAssign?: () => void
}

export default function DeckCard({
  title,
  subject,
  topic,
  level,
  cardCount,
  thumbnailUrl,
  progressPercent = 0,
  rating,
  price,
  isMarketplace,
  themeColor = 'bg-blue-500',
  onEdit,
  onStudy,
  onShare,
  onDownload,
  onSell,
  onAssign,
}: DeckCardProps) {
  return (
    <Card className="group relative flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-xl transition-all duration-300">
      {/* Thumbnail Area */}
      <div className={`h-40 w-full relative rounded-t-2xl overflow-hidden ${thumbnailUrl ? '' : themeColor}`}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(0,0,0,0.2)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.2)_75%,transparent_75%,transparent)] bg-[length:16px_16px]" />
        )}
        
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-white/90 dark:bg-black/90 text-slate-900 dark:text-white rounded-md backdrop-blur-sm shadow-sm">
            {subject}
          </span>
          {isMarketplace && (
            <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white rounded-md shadow-sm">
              KES {price}
            </span>
          )}
        </div>

        {/* Action Menu (Top Right) */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="p-1.5 bg-white/90 dark:bg-black/90 rounded-md shadow-sm text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-black transition-colors backdrop-blur-sm">
              <MoreVertical size={16} />
            </Menu.Button>
            <Transition
              as={React.Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 focus:outline-none z-10">
                <div className="p-1">
                  {onEdit && (
                    <Menu.Item>
                      {({ active }) => (
                        <button onClick={onEdit} className={`${active ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'} group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium`}>
                          <Edit2 size={16} className="mr-2" /> Edit Deck
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  {onShare && (
                    <Menu.Item>
                      {({ active }) => (
                        <button onClick={onShare} className={`${active ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'} group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium`}>
                          <Share2 size={16} className="mr-2" /> Share
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  {onAssign && (
                    <Menu.Item>
                      {({ active }) => (
                        <button onClick={onAssign} className={`${active ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'} group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium`}>
                          <Users size={16} className="mr-2" /> Assign
                        </button>
                      )}
                    </Menu.Item>
                  )}
                </div>
                <div className="p-1">
                  {onDownload && (
                    <Menu.Item>
                      {({ active }) => (
                        <button onClick={onDownload} className={`${active ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'} group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium`}>
                          <DownloadCloud size={16} className="mr-2" /> Download PDF
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  {onSell && (
                    <Menu.Item>
                      {({ active }) => (
                        <button onClick={onSell} className={`${active ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'} group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium`}>
                          <ShoppingCart size={16} className="mr-2" /> Sell on Marketplace
                        </button>
                      )}
                    </Menu.Item>
                  )}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>

      {/* Progress Bar (Always visible across top of content) */}
      {progressPercent > 0 && (
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col min-w-0 overflow-hidden">
        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-1 truncate w-full" title={title}>
          {title}
        </h3>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 truncate w-full">
          {level} • {topic}
        </p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
              {cardCount} Cards
            </span>
            {rating && (
              <span className="flex items-center text-xs font-bold text-amber-500">
                ★ {rating.toFixed(1)}
              </span>
            )}
          </div>

          <button 
            onClick={onStudy}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all"
            aria-label="Study Deck"
          >
            <Play size={18} fill="currentColor" className="ml-1" />
          </button>
        </div>
      </div>
    </Card>
  )
}
