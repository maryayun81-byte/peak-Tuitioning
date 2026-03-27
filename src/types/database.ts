export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      [_ in string]: {
        Row: {
          [_ in string]: any
        }
        Insert: {
          [_ in string]: any
        }
        Update: {
          [_ in string]: any
        }
      }
    }
    Views: {
      [_ in string]: any
    }
    Functions: {
      [_ in string]: any
    }
    Enums: {
      [_ in string]: any
    }
  }
}

export type Assignment = any
export type Submission = any
export type TuitionEvent = any
export type Profile = any
export type Student = any
export type Teacher = any
export type TuitionClass = any
export type Subject = any
export type Attendance = any
export type Quiz = any
export type Question = any
export type ExamMark = any
export type Timetable = any
export type Scheme = any
export type Resource = any
export type WorksheetBlock = any
export type Worksheet = any
export type ReportType = any
export type Notification = any
export type Class = any
export type ClassTeacher = any
export type Curriculum = any
export type Transcript = any
export type TeacherAssignment = any
export type QuestionType = any
export type DifficultyLevel = any
export type WorksheetAnswers = any
export type QuizAttempt = any
export type ExamEvent = any
export type GradingSystem = any
export type Parent = any
export type Payment = any
export type StudentGoal = any
export type Achievement = any
export type GradingScale = any
export type SubjectResult = any
export type Theme = any
export type AgeStyle = any
export type PracticeQuestion = any
export type Topic = any
export type SchemeOfWork = any
