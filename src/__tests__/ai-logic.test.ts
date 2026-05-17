import { describe, it, expect } from 'vitest'
import { shouldGenerateLessonImage, buildLessonImagePrompt } from '@/lib/ai-utils'

describe('Peak AI Logic', () => {
  describe('shouldGenerateLessonImage', () => {
    it('should return true for academic teaching requests', () => {
      expect(shouldGenerateLessonImage('Teach me about alkanes')).toBe(true)
      expect(shouldGenerateLessonImage('Explain photosynthesis')).toBe(true)
      expect(shouldGenerateLessonImage('What is the water cycle?')).toBe(true)
    })

    it('should return false for conversational or non-academic requests', () => {
      expect(shouldGenerateLessonImage('Hi coach, how are you?')).toBe(false)
      expect(shouldGenerateLessonImage('Thanks for the help!')).toBe(false)
      expect(shouldGenerateLessonImage('Create a study plan for me')).toBe(false)
    })

    it('should return false for quiz or marking modes', () => {
      expect(shouldGenerateLessonImage('Quiz me on Biology')).toBe(false)
      expect(shouldGenerateLessonImage('Test my knowledge')).toBe(false)
    })
  })

  describe('buildLessonImagePrompt', () => {
    it('should include strict quality and no-gibberish instructions', () => {
      const prompt = buildLessonImagePrompt(
        'alkanes',
        '8-4-4 Form 3',
        'Chemical structure of Methane'
      )
      
      expect(prompt).toContain('STRICTLY NO GIBBERISH')
      expect(prompt).toContain('Professional, high-fidelity')
      expect(prompt).toContain('vector style')
    })

    it('should correctly embed curriculum and concept', () => {
      const prompt = buildLessonImagePrompt(
        'Photosynthesis',
        'CBC Grade 7',
        'Diagram of a leaf cross-section'
      )
      
      expect(prompt).toContain('CBC Grade 7')
      expect(prompt).toContain('Diagram of a leaf cross-section')
    })
  })
})
