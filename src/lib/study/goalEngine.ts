import { AgeStyle } from '@/types/database'

export interface GoalTemplate {
  style: AgeStyle
  title: string
  description: string
  prompt: string
  example: string
}

export const getGoalTemplate = (level: number): GoalTemplate => {
  // Mapping levels to labels:
  // Grade 4-6: levels 4-6
  // Grade 7-9: levels 7-9
  // Grade 10: level 10
  // Form 3-4 (Grade 11-12): levels 11-12

  if (level <= 6) {
    return {
      style: 'exploration',
      title: 'Exploration Mode',
      description: 'Fun, imaginative, and light storytelling to build interest.',
      prompt: 'What area are you exploring today? Adventure awaits!',
      example: '“Today you’re exploring the world of fractions. Solve 5 fraction problems to unlock the next level.”'
    }
  }

  if (level <= 9) {
    return {
      style: 'skill_building',
      title: 'Skill-Building Mode',
      description: 'Challenge-based prompts to build competence and confidence.',
      prompt: 'Which skill are you mastering today?',
      example: '“Complete 10 algebra problems to strengthen your equation-solving skills and improve accuracy.”'
    }
  }

  if (level === 10) {
    return {
      style: 'transition',
      title: 'Transition Mode',
      description: 'Balanced narrative with real purpose for building identity.',
      prompt: 'What foundation are you building today?',
      example: '“Work through this chapter carefully. This session builds the foundation you need for more advanced topics.”'
    }
  }

  return {
    style: 'mastery',
    title: 'Mastery Mode',
    description: 'Direct, aspirational, and discipline-focused for autonomous learners.',
    prompt: 'What is your focus for this mastery session?',
    example: '“Complete this revision set with full focus. This directly strengthens your exam readiness.”'
  }
}

export const generateStorytellingGoal = (template: GoalTemplate, subject: string, task: string): string => {
  const { style } = template
  
  if (style === 'exploration') {
    return `Today you’re exploring the world of ${subject}. ${task} to unlock the next level and become a ${subject} explorer.`
  }
  
  if (style === 'skill_building') {
    return `${task} for ${subject} to strengthen your skills and improve your accuracy.`
  }
  
  if (style === 'transition') {
    return `Focus on ${subject} today. ${task} will build the foundation you need for more advanced topics.`
  }
  
  return `Master ${subject} with full focus. ${task} directly strengthens your exam readiness and problem-solving speed.`
}
