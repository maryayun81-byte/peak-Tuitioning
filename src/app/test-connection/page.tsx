'use client'

import { useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function TestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseBrowserClient()

  const runTest = async () => {
    setLoading(true)
    setResult('Testing...')
    try {
      console.log('Test: Calling supabase.auth.getUser()')
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('Test: Calling profiles select')
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .limit(1)
      
      setResult({ user: user?.email, data, error })
    } catch (e: any) {
      setResult({ error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-10 space-y-4">
      <h1 className="text-xl font-bold">Raw Connectivity Test</h1>
      <button 
        onClick={runTest}
        className="px-4 py-2 bg-blue-500 text-white rounded"
        disabled={loading}
      >
        {loading ? 'Running...' : 'Run Raw Fetch Test'}
      </button>
      <pre className="p-4 bg-gray-100 rounded overflow-auto max-h-96 text-xs text-black">
        {JSON.stringify(result, null, 2)}
      </pre>
      <p className="text-xs text-gray-500">
        Check your console (F12) for detailed timing logs.
      </p>
    </div>
  )
}
