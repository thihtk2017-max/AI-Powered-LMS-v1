import { useState } from 'react';
import { Question } from '../types/exam';

interface RemedialQuizProps {
  questions: Question[];
  onFinish: () => void;
}

export default function RemedialQuiz({ questions, onFinish }: RemedialQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = selectedAnswer === currentQuestion.correct_answer || selectedAnswer?.startsWith(currentQuestion.correct_answer);

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      onFinish();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold font-display text-gray-800 dark:text-white">Remedial Quiz</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Let's reinforce what you've learned.</p>
        </header>
        <main className="p-6 overflow-y-auto">
            <p className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-200">{currentQuestion.q_id}. {currentQuestion.content}</p>
            <div className="space-y-3">
                {currentQuestion.options.map(opt => {
                    const isSelected = selectedAnswer === opt;
                    let buttonClass = 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600';
                    if (isAnswered) {
                        if (opt === currentQuestion.correct_answer || opt.startsWith(currentQuestion.correct_answer)) {
                            buttonClass = 'bg-green-100 dark:bg-green-900 border-green-500';
                        } else if (isSelected) {
                            buttonClass = 'bg-red-100 dark:bg-red-900 border-red-500';
                        }
                    }

                    return (
                        <button 
                            key={opt}
                            onClick={() => handleAnswer(opt)}
                            disabled={isAnswered}
                            className={`w-full text-left p-4 rounded-lg border transition-colors duration-200 ${buttonClass} disabled:cursor-not-allowed`}>
                            {opt}
                        </button>
                    );
                })}
            </div>
        </main>
        <footer className="p-4 border-t dark:border-gray-700 mt-auto">
            {isAnswered && (
                <div className='flex justify-between items-center'>
                    <div className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {isCorrect ? 'Correct!' : 'Incorrect.'}
                    </div>
                    <button onClick={handleNext} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    </button>
                </div>
            )}
        </footer>
      </div>
    </div>
  );
}
