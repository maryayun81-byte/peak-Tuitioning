'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, Pause, FileAudio, Plus, Search, Waves, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/stores/authStore'
import { saveVoiceNote, getStudentVoiceNotes } from '@/app/actions/voice'
import toast from 'react-hot-toast'

export default function VoiceNotes() {
  const { student } = useAuthStore()
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Creation modal state
  const [isCreating, setIsCreating] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Playback state
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (student?.id) loadNotes()
  }, [student?.id])

  const loadNotes = async () => {
    if (!student?.id) return
    try {
      const data = await getStudentVoiceNotes(student.id)
      setNotes(data)
    } catch (e) {
      toast.error('Failed to load voice notes')
    } finally {
      setLoading(false)
    }
  }

  const startRecording = async () => {
    if (!noteTitle) {
      toast.error('Please enter a topic or title first')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAndSaveAudio(audioBlob)
        
        // Cleanup stream
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (e) {
      toast.error('Microphone access denied or not available')
      console.error(e)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const processAndSaveAudio = async (blob: Blob) => {
    setIsProcessing(true)
    try {
      // Convert Blob to Base64
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = async () => {
        const base64Audio = reader.result as string
        
        await saveVoiceNote(student!.id, noteTitle, base64Audio)
        toast.success('Voice note saved & transcribed!', { icon: '🎙️' })
        
        setIsCreating(false)
        setNoteTitle('')
        loadNotes()
      }
    } catch (e) {
      toast.error('Failed to save voice note')
    } finally {
      setIsProcessing(false)
    }
  }

  const togglePlay = (note: any) => {
    if (playingId === note.id) {
      // Pause
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      // Play new
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const newAudio = new Audio(note.audio_url)
      newAudio.onended = () => setPlayingId(null)
      newAudio.play()
      audioRef.current = newAudio
      setPlayingId(note.id)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) return <div className="p-6 flex justify-center items-center h-64"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>

  return (
    <div className="p-6 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>Voice Revision Notes</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Think out loud. Peak AI will transcribe and summarize your thoughts.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="rounded-2xl shadow-lg shadow-rose-500/20 bg-rose-500 hover:bg-rose-600 border-none text-white transition-all">
          <Mic size={16} className="mr-2" /> Record Note
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="p-8 border-rose-500/20 bg-rose-500/5 shadow-xl mb-6 text-center space-y-6">
              
              {!isRecording && !isProcessing && (
                <div className="max-w-md mx-auto space-y-4">
                  <h3 className="font-black text-xl text-rose-500">What are we revising?</h3>
                  <Input 
                    placeholder="e.g. Causes of World War 1" 
                    value={noteTitle} 
                    onChange={e => setNoteTitle(e.target.value)} 
                    className="rounded-xl text-center text-lg py-6" 
                  />
                  <div className="flex justify-center gap-4 pt-4">
                    <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                    <Button onClick={startRecording} className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-8 py-6 flex items-center gap-2 shadow-xl shadow-rose-500/30">
                      <Mic size={24} /> Start Recording
                    </Button>
                  </div>
                </div>
              )}

              {isRecording && (
                <div className="space-y-6">
                  <h3 className="font-black text-xl" style={{ color: 'var(--text)' }}>{noteTitle}</h3>
                  <div className="text-5xl font-black tabular-nums text-rose-500">
                    {formatTime(recordingTime)}
                  </div>
                  
                  {/* Fake waveform animation */}
                  <div className="flex items-center justify-center gap-1 h-16">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: ['20%', '100%', '20%'] }}
                        transition={{ repeat: Infinity, duration: 0.5 + Math.random(), delay: Math.random() }}
                        className="w-2 bg-rose-500 rounded-full"
                      />
                    ))}
                  </div>

                  <div className="flex justify-center pt-4">
                    <Button onClick={stopRecording} className="bg-[var(--card)] hover:bg-rose-50 text-rose-500 border-2 border-rose-500 rounded-full px-8 py-6 flex items-center gap-2 shadow-xl">
                      <Square size={24} className="fill-current" /> Stop & Save
                    </Button>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="py-12 space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin mx-auto" />
                  <p className="font-bold text-rose-500 animate-pulse">Peak AI is transcribing your note...</p>
                </div>
              )}

            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <Input className="pl-12 py-6 rounded-3xl" placeholder="Search your voice notes..." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map((note: any) => {
          const isPlaying = playingId === note.id
          return (
            <motion.div key={note.id} whileHover={{ y: -5 }}>
              <Card className={`p-6 h-full flex flex-col hover:shadow-xl transition-all border-t-4 ${isPlaying ? 'border-t-rose-500 shadow-rose-500/10' : 'border-t-transparent'}`}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-lg pr-4 line-clamp-1" style={{ color: 'var(--text)' }}>{note.title}</h3>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`rounded-full w-10 h-10 p-0 shrink-0 ${isPlaying ? 'bg-rose-500 text-white hover:bg-rose-600 hover:text-white' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'}`}
                    onClick={() => togglePlay(note)}
                  >
                    {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current ml-1" />}
                  </Button>
                </div>
                
                <p className="text-xs font-bold mb-4 text-muted">
                  {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                <div className="bg-[var(--input)] p-4 rounded-2xl mb-4 relative overflow-hidden group">
                  <div className="absolute top-2 right-2 opacity-10">
                    <Sparkles size={24} />
                  </div>
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-rose-500 mb-1 flex items-center gap-1">
                    <Sparkles size={10} /> AI Summary
                  </h4>
                  <p className="text-xs line-clamp-3" style={{ color: 'var(--text)' }}>
                    {note.ai_summary || note.transcript || "Processing transcript..."}
                  </p>
                </div>
                
                <div className="mt-auto pt-2">
                  <Button variant="ghost" size="sm" className="w-full text-xs font-bold text-muted hover:text-primary">
                    <FileAudio size={14} className="mr-2" /> Read Full Transcript
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}

        {notes.length === 0 && !isCreating && (
          <Card className="col-span-full p-12 text-center border-dashed">
            <Mic size={48} className="mx-auto text-muted opacity-20 mb-4" />
            <h3 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>No Voice Notes</h3>
            <p className="text-sm text-muted font-bold mb-6 max-w-sm mx-auto">Sometimes talking out loud is the best way to memorize. Record your first voice note!</p>
            <Button onClick={() => setIsCreating(true)} className="rounded-2xl bg-rose-500 hover:bg-rose-600 text-white border-none shadow-xl shadow-rose-500/20">
              Record Note
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
