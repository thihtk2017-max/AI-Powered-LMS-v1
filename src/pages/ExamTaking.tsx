import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, setDoc, getDocFromCache } from 'firebase/firestore';
import { db } from '../firebase';
import { Exam, Question } from '../types/exam';
import Spinner from '../components/Spinner';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ExamTaking() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(0);
  const [initialTime, setInitialTime] = useState(0);
  const [leaveCount, setLeaveCount] = useState(0);
    const [examStarted, setExamStarted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
    if (!examId || !currentUser) return;

    const loadExamAndProgress = async () => {
      try {
        // 1. Load exam data
        const docRef = doc(db, 'exams', examId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const examData = { id: docSnap.id, ...docSnap.data() } as Exam;
          setExam(examData);
          setQuestions(examData.questions || []);

          // 2. Load in-progress answers if they exist
          const progressRef = doc(db, 'in_progress_exams', `${currentUser.id}_${examId}`);
          const progressSnap = await getDoc(progressRef);
          if (progressSnap.exists()) {
            const progressData = progressSnap.data();
            setAnswers(progressData.answers || {});
            setCurrentQuestionIndex(progressData.currentQuestionIndex || 0);
          } else {
             // Default to 1.5 minutes per question if not specified
                        const timeLimit = (examData.questions?.length || 20) * 90;
            setTimeLeft(timeLimit);
            setInitialTime(timeLimit);
          }
          setExamStarted(true);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching exam: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExamAndProgress();
  }, [examId, currentUser]);

  useEffect(() => {
    if (!examStarted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    if (timeLeft === 1) {
        setTimeout(handleSubmit, 1000);
    }

    return () => clearInterval(timer);
  }, [timeLeft, examStarted]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setLeaveCount(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (leaveCount >= 3) {
      alert('You have left the tab too many times. Your exam will be submitted automatically.');
      handleSubmit();
    }
    }, [leaveCount]);

  // Auto-save progress
  useEffect(() => {
    if (!currentUser || !examId || !examStarted || Object.keys(answers).length === 0) return;

    const saveProgress = async () => {
      setIsSaving(true);
      try {
        const progressRef = doc(db, 'in_progress_exams', `${currentUser.id}_${examId}`);
        await setDoc(progressRef, { 
          answers, 
          currentQuestionIndex,
          timeLeft,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Error saving progress: ", error);
      } finally {
        setIsSaving(false);
      }
    };

    // Debounce saving to avoid too many writes
    const handler = setTimeout(() => {
      saveProgress();
    }, 2000);

    return () => {
      clearTimeout(handler);
    };

  }, [answers, currentQuestionIndex, timeLeft, currentUser, examId, examStarted]);

      if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h1 className="text-2xl font-bold font-display text-gray-800 dark:text-white">Exam Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          The requested exam could not be found. It may have been removed.
        </p>
        <button 
          onClick={() => navigate(currentUser?.role === 'teacher' ? '/teacher' : '/student')}
          className="mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
          Back to Exam Library
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h1 className="text-2xl font-bold font-display text-gray-800 dark:text-white">No Questions Available</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          It looks like this exam hasn't been fully configured yet.
        </p>
        <button 
          onClick={() => navigate(currentUser?.role === 'teacher' ? '/teacher' : '/student')}
          className="mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
          Back to Exam Library
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerSelect = (q_id: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [q_id]: answer }));
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

      const handleSubmit = async () => {
    if (!currentUser || !exam) return;

    // Calculate score
    let score = 0;
    for (const q of questions) {
      const userAnswer = answers[q.q_id];
      const correctAnswer = q.correct_answer;
      // Use the same robust checking as in the results page
      if (userAnswer === correctAnswer || (userAnswer && correctAnswer && userAnswer.startsWith(correctAnswer))) {
        score++;
      }
    }

        const resultData = {
      studentId: currentUser.id,
      studentName: currentUser.name,
      examId: exam.id,
      examTitle: exam.exam_metadata.title,
      answers: answers,
      score: score,
      totalQuestions: questions.length,
      submittedAt: serverTimestamp(),
      timeSpent: initialTime - timeLeft,
    };

    try {
      const docRef = await addDoc(collection(db, 'results'), resultData);
      await addDoc(collection(db, 'user_activity'), { 
        userId: currentUser.id, 
        action: 'submit_exam', 
        examId: exam.id, 
        examTitle: exam.exam_metadata.title,
        score: score,
        totalQuestions: questions.length,
        timestamp: serverTimestamp() 
      });
      navigate(`/results/${docRef.id}`);
    } catch (error) {
      console.error("Error submitting exam results: ", error);
      alert('There was an error submitting your exam. Please try again.');
    }
  };

  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col p-4 sm:p-6 lg:p-8">
      {leaveCount > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <AlertTriangle size={20} />
          <span className="font-semibold">Warning: You have left the exam tab {leaveCount} time(s). Three leaves will result in auto-submission.</span>
        </div>
      )}
      <header className="w-full max-w-4xl mx-auto mb-4">
        <h1 className="text-2xl font-bold font-display text-gray-800 dark:text-white">{exam.exam_metadata.title}</h1>
        <div className="flex justify-between items-center mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
                    <div className="absolute top-2 right-2 text-sm text-gray-500 flex items-center gap-2">
            {isSaving && <><Spinner /><span>Saving...</span></>}
          </div>
          <div className="ml-4 text-lg font-mono font-semibold text-gray-700 dark:text-gray-300">
            {Math.floor(timeLeft / 60)}:{('0' + (timeLeft % 60)).slice(-2)}
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-gray-800 dark:text-gray-200">
          <p className="font-semibold text-lg mb-4">{currentQuestion.q_id}. {currentQuestion.content}</p>
          <div className="space-y-3">
            {currentQuestion.options.map(opt => (
              <button 
                key={opt}
                                onClick={() => handleAnswerSelect(currentQuestion.q_id, opt)}
                className={`w-full text-left p-4 rounded-lg border transition-colors duration-200 ${
                                    answers[currentQuestion.q_id] === opt
                    ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-500'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600'
                }`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-4xl mx-auto mt-4 flex justify-between items-center">
        <button onClick={goToPrev} disabled={currentQuestionIndex === 0} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronLeft size={20} />
          Previous
        </button>
        {currentQuestionIndex === questions.length - 1 ? (
          <button onClick={handleSubmit} className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-colors">
            Submit Exam
          </button>
        ) : (
          <button onClick={goToNext} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700">
            Next
            <ChevronRight size={20} />
          </button>
        )}
      </footer>
    </div>
  );
}
