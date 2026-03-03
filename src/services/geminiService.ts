import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';
import { Question } from '../types/exam';
import { fileToGenerativePart } from '../utils/file';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const model = 'gemini-3-flash-preview';

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    q_id: { type: Type.STRING, description: 'Unique identifier for the question, e.g., "1" or "Câu 1"' },
    content: { type: Type.STRING, description: 'The full text content of the question.' },
    options: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: 'An array of 4 strings, representing the options A, B, C, D.'
    },
    correct_answer: { type: Type.STRING, description: 'The correct option letter, e.g., "A", "B", "C", or "D". If not identifiable, leave empty.' },
    topic_tag: { type: Type.STRING, description: 'A concise knowledge topic for this question, e.g., "Đạo hàm".' },
    difficulty: { type: Type.STRING, description: 'Estimated difficulty: "Easy", "Medium", or "Hard".' },
    explanation: { type: Type.STRING, description: 'A detailed explanation for the correct answer.' },
  },
  required: ['q_id', 'content', 'options', 'topic_tag', 'difficulty']
};

export async function extractQuestionsFromExam(file: File): Promise<Question[]> {
  console.log('Starting extraction for file:', file.name, 'type:', file.type);
  let contentPart;
  let promptText = 'You are an expert AI assistant for educators. Your task is to accurately extract all multiple-choice questions from the provided exam document. Analyze the document and return a structured JSON array of all questions found.';

  try {
    // Check for DOCX file type
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith('.docx')) {
      console.log('Processing as DOCX using mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const mammothResult = await mammoth.extractRawText({ arrayBuffer });
      contentPart = { text: mammothResult.value };
      promptText = 'You are an expert AI assistant for educators. Your task is to accurately extract all multiple-choice questions from the provided text content, which was extracted from a DOCX file. Analyze the text and return a structured JSON array of all questions found. Each question should have q_id, content, options (array of 4), topic_tag, difficulty, and explanation.';
    } else {
      console.log('Processing as generic file (PDF/Image)');
      contentPart = await fileToGenerativePart(file);
      // Ensure mimeType is set if missing
      if (contentPart.inlineData && !contentPart.inlineData.mimeType) {
        if (file.name.endsWith('.pdf')) contentPart.inlineData.mimeType = 'application/pdf';
        else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) contentPart.inlineData.mimeType = 'image/jpeg';
        else if (file.name.endsWith('.png')) contentPart.inlineData.mimeType = 'image/png';
      }
    }

    console.log('Calling Gemini API...');
    const result = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: promptText },
          contentPart,
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: questionSchema,
        },
      },
    });

    const response = result.text;
    console.log('Gemini response received');
    if (!response) {
      console.error('Empty response from Gemini');
      return [];
    }

    const parsedJson = JSON.parse(response);
    console.log('Successfully parsed', parsedJson.length, 'questions');
    return parsedJson as Question[];
  } catch (e) {
    console.error('Error during extraction process:', e);
    throw e; // Re-throw to be caught by the UI
  }
}

export async function generateReinforcementExam(topics: string[], questionCount: number = 10): Promise<Question[]> {
  const prompt = `Bạn là một chuyên gia giáo dục. Nhiệm vụ của bạn là tạo ra một bài kiểm tra thực hành ngắn gọn, tập trung cho học sinh đang gặp khó khăn với các chủ đề cụ thể.
  
  YÊU CẦU QUAN TRỌNG: Toàn bộ nội dung câu hỏi, các lựa chọn và giải thích PHẢI bằng TIẾNG VIỆT.

  Các chủ đề cần bao gồm: ${topics.join(', ')}
  Số lượng câu hỏi cần tạo: ${questionCount}

  Vui lòng tạo các câu hỏi trắc nghiệm duy nhất. Đảm bảo chúng liên quan đến các chủ đề được cung cấp và có độ khó khác nhau. Trả về các câu hỏi dưới dạng một mảng JSON có cấu trúc.`;

  const result = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: questionSchema,
      },
    },
  });

  const response = result.text;
  try {
    const parsedJson = JSON.parse(response);
    return parsedJson as Question[];
  } catch (e) {
    console.error('Error parsing JSON from Gemini for reinforcement exam:', e);
    return [];
  }
}

export async function getAIMentorExplanation(question: any, userAnswer: string): Promise<string> {
  const prompt = `You are an AI Mentor for students. A student has answered a multiple-choice question incorrectly. 
  Your task is to provide a clear, concise, and encouraging explanation.

  Question: "${question.content}"
  Options: ${question.options.join(', ')}
  Correct Answer: ${question.correct_answer}
  Student's Incorrect Answer: ${userAnswer}

  Please explain why the student's answer is incorrect and why the correct answer is right. Be supportive and focus on the underlying concept.`

  const result = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
  });

  return result.text;
}
