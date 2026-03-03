import { useState, useEffect } from 'react';
import { Question } from '../types/exam';
import Modal from './Modal';

interface QuickAnswerMatrixProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onVerify: (answers: Record<string, string>) => void;
}

const OPTIONS = ['A', 'B', 'C', 'D'];

export default function QuickAnswerMatrix({ isOpen, onClose, questions, onVerify }: QuickAnswerMatrixProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pasteInput, setPasteInput] = useState('');

  useEffect(() => {
    const initialAnswers: Record<string, string> = {};
    questions.forEach(q => {
      if (q.correct_answer && OPTIONS.includes(q.correct_answer.toUpperCase())) {
        initialAnswers[q.q_id] = q.correct_answer.toUpperCase();
      }
    });
    setAnswers(initialAnswers);
  }, [questions, isOpen]);

  const handleAnswerSelect = (q_id: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [q_id]: answer }));
  };

  const handleSmartPaste = () => {
    const parsedAnswers: Record<string, string> = {};
    const regex = /(\d+)[\s.-]*([A-D])/gi;
    let match;
    while ((match = regex.exec(pasteInput)) !== null) {
      const qNum = match[1];
      const answer = match[2].toUpperCase();
      // Find the corresponding q_id from the questions list
      const question = questions.find(q => q.q_id.toString().endsWith(qNum));
      if (question) {
        parsedAnswers[question.q_id] = answer;
      }
    }
    setAnswers(prev => ({ ...prev, ...parsedAnswers }));
    setPasteInput('');
  };

  const handleSave = () => {
    onVerify(answers);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Answer Matrix">
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Smart Copy-Paste</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Paste answer string here (e.g., 1A 2B 3C...)"
              className="flex-grow p-2 border rounded-md"
            />
            <button onClick={handleSmartPaste} className="bg-gray-200 px-4 rounded-md hover:bg-gray-300">Parse</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
          {questions.map((q, index) => (
            <div key={`${q.q_id}-${index}`} className="flex items-center gap-4">
              <span className="font-bold text-gray-700 w-12">{q.q_id}</span>
              <div className="flex gap-1">
                {OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleAnswerSelect(q.q_id, opt)}
                    className={`w-8 h-8 rounded-md text-sm font-bold transition-colors ${
                      answers[q.q_id] === opt
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <button onClick={handleSave} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-md hover:bg-indigo-700 transition-colors">
            Save & Verify Answers
          </button>
        </div>
      </div>
    </Modal>
  );
}
