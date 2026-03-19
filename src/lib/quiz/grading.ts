/**
 * Quiz Grading Engine
 * Implements logic for MCQ, Multiple Answer, True/False, and Intelligent Short Answer evaluation.
 */

export type QuestionType = 'multiple_choice' | 'multiple_answer' | 'true_false' | 'short_answer'
export type GradingMethod = 'exact' | 'keyword' | 'similarity'

export interface GradingQuestion {
  id: string
  type: QuestionType
  correct_answer?: string
  correct_answers?: string[]
  keywords?: string[]
  grading_method?: GradingMethod
  marks: number
}

/**
 * Grades a single question based on student answer
 */
export const gradeQuestion = (question: GradingQuestion, studentAnswer: any): number => {
  if (!studentAnswer) return 0;

  switch (question.type) {
    case 'multiple_choice':
    case 'true_false':
      return studentAnswer === question.correct_answer ? question.marks : 0;

    case 'multiple_answer': {
      const selected = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
      const correct = question.correct_answers || [];
      
      if (selected.length !== correct.length) return 0;
      
      const allMatch = selected.every(val => correct.includes(val)) && 
                       correct.every(val => selected.includes(val));
      
      return allMatch ? question.marks : 0;
    }

    case 'short_answer': {
      const answer = (studentAnswer as string).trim().toLowerCase();
      const method = question.grading_method || 'exact';

      if (method === 'exact') {
        const correctOnes = (question.correct_answers || []).map(a => a.trim().toLowerCase());
        return correctOnes.includes(answer) ? question.marks : 0;
      }

      if (method === 'keyword') {
        const keywords = (question.keywords || []).map(k => k.trim().toLowerCase());
        if (keywords.length === 0) return 0;
        
        let matchedCount = 0;
        keywords.forEach(kw => {
          if (answer.includes(kw)) matchedCount++;
        });

        // score = (matched_keywords / total_keywords) * marks
        return (matchedCount / keywords.length) * question.marks;
      }

      if (method === 'similarity') {
        const correct = (question.correct_answers?.[0] || '').trim().toLowerCase();
        const similarity = calculateSimilarity(answer, correct);

        // similarity >= 0.8 -> full marks
        // similarity >= 0.6 -> partial marks
        // similarity < 0.6 -> zero
        if (similarity >= 0.8) return question.marks;
        if (similarity >= 0.6) return question.marks * 0.5;
        return 0;
      }

      return 0;
    }

    default:
      return 0;
  }
}

/**
 * Simple Cosine Similarity implementation for text matching
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  const allWords = new Set([...words1, ...words2]);
  const vec1: number[] = [];
  const vec2: number[] = [];
  
  allWords.forEach(word => {
    vec1.push(words1.includes(word) ? 1 : 0);
    vec2.push(words2.includes(word) ? 1 : 0);
  });
  
  const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
  
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

/**
 * Grades a whole quiz attempt
 */
export const gradeQuiz = (questions: GradingQuestion[], studentAnswers: Record<string, any>) => {
  let totalScore = 0;
  let maxPossibleMarks = 0;
  const details: Record<string, { score: number; max: number }> = {};

  questions.forEach(q => {
    const score = gradeQuestion(q, studentAnswers[q.id]);
    totalScore += score;
    maxPossibleMarks += q.marks;
    details[q.id] = { score, max: q.marks };
  });

  const percentage = maxPossibleMarks > 0 ? (totalScore / maxPossibleMarks) * 100 : 0;

  return {
    totalScore,
    maxPossibleMarks,
    percentage: Math.round(percentage * 100) / 100,
    details
  };
}
