import { Question } from "../types/exam";
import { AlertTriangle } from 'lucide-react';

interface QuestionEditorProps {
  questions: Question[];
  verifiedAnswers: Record<string, string>;
  onOpenMatrix: () => void;
  onVerify: (answers: Record<string, string>) => void;
}

export default function QuestionEditor({ questions, verifiedAnswers, onOpenMatrix, onVerify }: QuestionEditorProps) {
  const handleOptionChange = (qId: string, optionLetter: string) => {
    onVerify({
      ...verifiedAnswers,
      [qId]: optionLetter
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b dark:border-gray-700">
        <h3 className="font-bold text-lg text-gray-800 dark:text-white">AI Extracted Questions</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Found {questions.length} questions. Please verify.</p>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar">
        {questions.map((q, index) => {
          const aiAnswer = q.correct_answer;
          const teacherAnswer = verifiedAnswers[q.q_id];
          const isMismatched = aiAnswer && teacherAnswer && aiAnswer !== teacherAnswer;

          return (
            <div key={index} className={`border rounded-lg p-4 transition-all ${isMismatched ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'bg-gray-50 dark:bg-gray-700/50 dark:border-gray-700 hover:border-indigo-300'}`}>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{q.q_id}. {q.content}</p>
              <div className="mt-3 space-y-2 text-sm">
                {q.options.map((opt, i) => {
                  const optionLetter = opt.charAt(0);
                  const isChecked = optionLetter === teacherAnswer;
                  
                  return (
                    <div 
                      key={i} 
                      className={`flex items-center p-2 rounded-md transition-colors cursor-pointer hover:bg-white dark:hover:bg-gray-600 ${isChecked ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800' : ''}`}
                      onClick={() => handleOptionChange(q.q_id, optionLetter)}
                    >
                      <input
                        type="radio"
                        name={`question-${q.q_id}`}
                        id={`q-${q.q_id}-opt-${i}`}
                        checked={isChecked}
                        onChange={() => handleOptionChange(q.q_id, optionLetter)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label 
                        htmlFor={`q-${q.q_id}-opt-${i}`} 
                        className={`ml-3 block cursor-pointer flex-grow ${isChecked ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {opt}
                      </label>
                    </div>
                  );
                })}
              </div>
              {isMismatched && (
                <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  <span>AI suggested '{aiAnswer}', you verified '{teacherAnswer}'.</span>
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500">
                <span>Topic: {q.topic_tag}</span> | <span>Difficulty: {q.difficulty}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
          <button 
            onClick={onOpenMatrix}
            className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
            Open Quick Answer Matrix & Verify
          </button>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
