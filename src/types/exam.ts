export enum ExamType {
  STRUCTURED = 'TYPE_STRUCTURED',
  AI_GENERATED = 'TYPE_AI_GENERATED',
}

export enum AnswerKeySource {
  MANUAL_ENTRY = 'manual_entry',
  AI_EXTRACTED = 'ai_extracted',
}

export enum ExamStatus {
  VERIFIED = 'verified',
  PENDING = 'pending',
}

export interface ExamMetadata {
  exam_id: string;
  title: string;
  exam_type: ExamType;
  answer_key_source: AnswerKeySource;
  status: ExamStatus;
  dueDate?: string; // ISO 8601 format
  createdBy?: string;
  createdAt?: string;
}

export interface Question {
  q_id: string;
  content: string;
  options: string[];
  correct_answer: string;
  topic_tag: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  explanation: string;
}

export interface Exam {
  id: string; // This is added dynamically from the doc id
  exam_metadata: ExamMetadata;
  questions: Question[];
}

export interface User {
  id: string;
  name: string;
  role: 'teacher' | 'student';
}

export interface ExamResult {
    id: string;
    studentId: string;
    studentName: string;
    examId: string;
    examTitle: string;
    answers: Record<string, string>;
    score: number;
    totalQuestions: number;
      submittedAt: any; // Firestore Timestamp
  timeSpent?: number; // in seconds
}
