import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Exam, Question } from '../types/exam';
import Spinner from '../components/Spinner';


export default function ExamEditor() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [verifiedAnswers, setVerifiedAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!examId) {
      setIsLoading(false);
      return;
    }

    const fetchExam = async () => {
      try {
        const docRef = doc(db, 'exams', examId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const examData = { id: docSnap.id, ...docSnap.data() } as Exam;
          setExam(examData);
          setQuestions(examData.questions || []);
          const initialAnswers = (examData.questions || []).reduce((acc, q) => {
            acc[q.q_id] = q.correct_answer || '';
            return acc;
          }, {} as Record<string, string>);
                    setVerifiedAnswers(initialAnswers);
          setTitle(examData.exam_metadata.title);
          setDueDate(examData.exam_metadata.dueDate || '');
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching exam:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  const handleQuestionChange = (index: number, field: 'content', value: string) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

    const handleCorrectAnswerChange = (q_id: string, answer: string) => {
    setVerifiedAnswers(prev => ({
      ...prev,
      [q_id]: answer,
    }));
  };

  const handleSaveChanges = async () => {
    if (!examId || !exam) return;
    setIsSaving(true);
    try {
      const examRef = doc(db, 'exams', examId);
      const updatedQuestions = questions.map(q => ({
        ...q,
        correct_answer: verifiedAnswers[q.q_id] || '',
      }));

            await updateDoc(examRef, {
        questions: updatedQuestions,
        'exam_metadata.title': title,
        'exam_metadata.dueDate': dueDate || null,
      });

      alert('Exam updated successfully!');
      navigate('/teacher');
    } catch (error) {
      console.error("Error updating document: ", error);
      alert('Failed to save changes. Please check the console.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  if (!exam) {
    return <div className="flex justify-center items-center h-screen">Exam not found.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold font-display mb-6">Edit Exam</h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold mb-1">Exam Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Due Date (Optional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2 border rounded-md" />
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={`${q.q_id}-${index}`} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Question {q.q_id}</label>
            <textarea
              value={q.content}
              onChange={(e) => handleQuestionChange(index, 'content', e.target.value)}
              className="mt-2 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={3}
            />
                        <div className="mt-4">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Options & Correct Answer</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Select the radio button for the correct answer.</p>
              <div className="mt-2 space-y-2">
                {q.options.map((opt, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-3">
                    <input
                      id={`${q.q_id}-${optIndex}`}
                      name={q.q_id}
                      type="radio"
                      checked={verifiedAnswers[q.q_id]?.trim().toUpperCase().charAt(0) === opt.trim().toUpperCase().charAt(0)}
                      onChange={() => handleCorrectAnswerChange(q.q_id, opt.trim().toUpperCase().charAt(0))}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      

      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={() => navigate('/teacher')}
          className="px-6 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg shadow-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSaving ? <Spinner /> : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
