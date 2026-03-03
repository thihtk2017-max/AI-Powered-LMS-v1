import { Link } from 'react-router-dom';
import { Exam } from '../types/exam';
import { Book, Clock, HelpCircle } from 'lucide-react';

interface ExamListProps {
  exams: Exam[];
  userType: 'teacher' | 'student';
  completedExamIds?: Set<string>;
  inProgressExams?: Record<string, any>;
  showTakeButton?: boolean;
  editButtonLabel?: string;
}

export default function ExamList({ 
  exams, 
  userType, 
  completedExamIds = new Set(), 
  inProgressExams = {},
  showTakeButton = false,
  editButtonLabel = 'Edit Exam'
}: ExamListProps) {
  if (exams.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No exams found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {exams.map((exam) => (
        <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
          <div className="p-6 flex-grow">
            <h2 className="text-lg font-bold font-display text-indigo-600 dark:text-indigo-400">{exam.exam_metadata.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ID: {exam.exam_metadata.exam_id}</p>
                        <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} />
                <span>{exam.questions.length} questions</span>
              </div>
              {inProgressExams[exam.id] && (
                <div>
                  <p className="font-semibold">In Progress</p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mt-1">
                    <div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${((inProgressExams[exam.id].currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
                    {userType === 'teacher' && (
             <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 rounded-b-lg flex flex-col gap-2">
                <Link to={`/teacher/edit/${exam.id}`} className="w-full text-center block bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
                  {editButtonLabel}
                </Link>
                {showTakeButton && (
                  <Link to={`/exam/${exam.id}`} className="w-full text-center block bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                    Take Exam
                  </Link>
                )}
              </div>
          )}
          {userType === 'student' && (
             <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 rounded-b-lg">
                                                                                {inProgressExams[exam.id] ? (
                  <Link to={`/exam/${exam.id}`} className="w-full text-center block bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors">
                    Continue Exam
                  </Link>
                ) : completedExamIds.has(exam.id) ? (
                  <Link to={`/exam/${exam.id}`} className="w-full text-center block bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                    Retake Exam
                  </Link>
                ) : (
                  <Link to={`/exam/${exam.id}`} className="w-full text-center block bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                    Start Exam
                  </Link>
                )}
              </div>
          )}
        </div>
      ))}
    </div>
  );
}
