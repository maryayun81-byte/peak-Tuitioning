'use client'

import { useEffect } from 'react'
import { generateStudentInsights } from '@/app/actions/ai'
import { useAuthStore } from '@/stores/authStore'

/**
 * InsightTrigger: Daily Proactive Intelligence Reports
 * Checks every 24 hours if a new behavioral insight report should be shown.
 */
export function InsightTrigger() {
  const { student } = useAuthStore()

  useEffect(() => {
    const checkInsights = async () => {
      if (!student?.id) return

      const lastCheck = localStorage.getItem(`peak_insight_last_check_${student.id}`)
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000

      // Only run once every 24 hours
      if (lastCheck && now - parseInt(lastCheck) < oneDay) {
        return
      }

      try {
        const res = await generateStudentInsights()
        
        if (res.success && res.insights) {
          // Trigger the AI Assistant to open programmatically
          const event = new CustomEvent('peak-ai-open', {
            detail: {
              message: res.insights,
              title: res.hasMissingMissions ? 'Urgent Intelligence Report' : 'Daily Growth Insights'
            }
          })
          window.dispatchEvent(event)
          
          // Mark as checked for today
          localStorage.setItem(`peak_insight_last_check_${student.id}`, now.toString())
        }
      } catch (err) {
        console.error('Failed to generate insights:', err)
      }
    }

    // Delay slightly after dashboard load to not overwhelm the student
    const timer = setTimeout(checkInsights, 3000)
    return () => clearTimeout(timer)
  }, [student?.id])

  return null
}
