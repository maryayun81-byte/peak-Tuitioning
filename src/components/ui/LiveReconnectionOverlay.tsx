'use client'

import { useEffect, useState } from 'react'
import { ConnectionState } from 'livekit-client'
import { useRoomContext } from '@livekit/components-react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, RefreshCw } from 'lucide-react'

export function LiveReconnectionOverlay() {
  const room = useRoomContext()
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Connected)

  useEffect(() => {
    if (!room) return
    const handleConnect = () => setConnectionState(ConnectionState.Connected)
    const handleDisconnect = () => setConnectionState(ConnectionState.Disconnected)
    const handleReconnecting = () => setConnectionState(ConnectionState.Reconnecting)
    const handleReconnected = () => setConnectionState(ConnectionState.Connected)

    room.on('connected', handleConnect)
    room.on('disconnected', handleDisconnect)
    room.on('reconnecting', handleReconnecting)
    room.on('reconnected', handleReconnected)

    setConnectionState(room.state)

    return () => {
      room.off('connected', handleConnect)
      room.off('disconnected', handleDisconnect)
      room.off('reconnecting', handleReconnecting)
      room.off('reconnected', handleReconnected)
    }
  }, [room])

  const isDisconnected = connectionState === ConnectionState.Disconnected
  const isReconnecting = connectionState === ConnectionState.Reconnecting

  return (
    <AnimatePresence>
      {(isDisconnected || isReconnecting) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center space-y-6 p-8"
          >
            <div className="w-20 h-20 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-2xl shadow-red-500/20">
              <WifiOff size={40} className={isReconnecting ? 'animate-pulse' : ''} />
            </div>
            <div className="text-center space-y-3">
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                {isReconnecting ? 'Reconnecting...' : 'Connection Lost'}
              </h2>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold max-w-sm">
                {isReconnecting
                  ? 'Attempting to restore your secure session stream.'
                  : 'Your connection to the live session has been interrupted.'}
              </p>
            </div>
            {isReconnecting && (
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
              </div>
            )}
            {isDisconnected && (
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
              >
                <RefreshCw size={16} /> Reconnect Now
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
