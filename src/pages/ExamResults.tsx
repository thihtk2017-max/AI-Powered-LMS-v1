import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, addDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Exam, Question, ExamResult } from '../types/exam';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { getAIMentorExplanation, generateReinforcementExam } from '../services/geminiService';
import Spinner from '../components/Spinner';

export default function ExamResults() {
  const { resultId } = useParams();

    const [result, setResult] = useState<ExamResult | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mentorResponse, setMentorResponse] = useState<Record<string, string>>({});
    const [isLoadingMentor, setIsLoadingMentor] = useState<Record<string, boolean>>({});
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
    const navigate = useNavigate();

  useEffect(() => {
    if (!resultId) {
      setIsLoading(false);
      return;
    }

    const fetchResultAndExam = async () => {
      try {
        // 1. Fetch the result document
        const resultRef = doc(db, 'results', resultId);
        const resultSnap = await getDoc(resultRef);

        if (!resultSnap.exists()) {
          console.log("No such result document!");
          setIsLoading(false);
          return;
        }
        const resultData = { id: resultSnap.id, ...resultSnap.data() } as ExamResult;
        setResult(resultData);

        // 2. Fetch the corresponding exam document
        const examRef = doc(db, 'exams', resultData.examId);
        const examSnap = await getDoc(examRef);

        if (examSnap.exists()) {
          const examData = { id: examSnap.id, ...examSnap.data() } as Exam;
          setExam(examData);
          setQuestions(examData.questions || []);
        } else {
          console.log("No such exam document!");
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResultAndExam();
  }, [resultId]);

    // Calculations are now derived from the fetched result and exam data
  const userAnswers = result?.answers || {};
  const score = result?.score || 0;
  const totalQuestions = result?.totalQuestions || questions.length || 0;

  const wrongQuestions = questions.filter(q => {
    const userAnswer = userAnswers[q.q_id];
    const correctAnswer = q.correct_answer;
    // Use the same robust checking
    return !(userAnswer === correctAnswer || (userAnswer && correctAnswer && userAnswer.startsWith(correctAnswer)));
  });

  const topicPerformance: Record<string, { correct: number, total: number }> = {};
  for (const q of questions) {
    const topic = (q as any).topic_tag || 'General';
    if (!topicPerformance[topic]) {
      topicPerformance[topic] = { correct: 0, total: 0 };
    }
    topicPerformance[topic].total++;

    const userAnswer = userAnswers[q.q_id];
    const correctAnswer = q.correct_answer;
    if (userAnswer === correctAnswer || (userAnswer && correctAnswer && userAnswer.startsWith(correctAnswer))) {
      topicPerformance[topic].correct++;
    }
  }

    

  const chartData = Object.entries(topicPerformance).map(([name, data]) => ({
    subject: name,
    A: (data.correct / data.total) * 100,
    fullMark: 100,
  }));

    const weakTopics = Object.entries(topicPerformance)
    .filter(([_, data]) => data.total > 0 && (data.correct / data.total) < 0.6)
    .map(([name, _]) => name);

  const handleGeneratePracticeExam = async () => {
    if (weakTopics.length === 0) return;
    setIsGeneratingExam(true);
    try {
      const newQuestions = await generateReinforcementExam(weakTopics);
      if (newQuestions.length === 0) {
        alert('The AI could not generate a practice exam at this time. Please try again later.');
        return;
      }

      const examId = `PRACTICE_${Date.now()}`;
      const newExamData = {
        id: examId,
        exam_metadata: {
          exam_id: examId,
          title: `Practice for: ${weakTopics.join(', ')}`,
          exam_type: 'TYPE_AI_GENERATED',
          answer_key_source: 'ai_extracted',
          status: 'verified',
        },
        questions: newQuestions,
      };

      // Since we are adding a new doc, we can just set it with its ID
            await setDoc(doc(db, "exams", examId), newExamData);
      alert(`A new practice exam has been created for you!`);
      navigate(`/exam/${examId}`);

    } catch (error) {
      console.error("Error generating practice exam: ", error);
      alert('An error occurred while creating your practice exam. Please try again.');
    } finally {
      setIsGeneratingExam(false);
    }
  };

  const handleGetExplanation = async (question: any) => {
    setIsLoadingMentor(prev => ({ ...prev, [question.q_id]: true }));
    try {
      const explanation = await getAIMentorExplanation(question, userAnswers[question.q_id]);
      setMentorResponse(prev => ({ ...prev, [question.q_id]: explanation }));
    } catch (error) {
      console.error('Failed to get explanation:', error);
      setMentorResponse(prev => ({ ...prev, [question.q_id]: 'Sorry, I could not fetch an explanation at this time.' }));
    } finally {
      setIsLoadingMentor(prev => ({ ...prev, [question.q_id]: false }));
    }
  };

    if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  if (!exam) {
    return <div className="flex justify-center items-center h-screen">Exam data could not be loaded.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-center mb-2">Exam Results</h1>
                <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-6">{exam?.exam_metadata?.title}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
            <h2 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Your Score</h2>
                                                <p className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{result?.score || 0}<span className="text-2xl">/{result?.totalQuestions || 0}</span></p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Correct Answers</p>
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-center mb-4">Skills Analysis</h2>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Performance" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

                <div>
          <h2 className="text-2xl font-bold font-display mb-4">Review Your Answers</h2>
          <div className="space-y-4">
            {questions.map((q, index) => {
              const userAnswer = userAnswers[q.q_id];
              const isCorrect = userAnswer === q.correct_answer || (userAnswer && q.correct_answer && userAnswer.startsWith(q.correct_answer));
              const bgColor = isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
              const borderColor = isCorrect ? 'border-green-500' : 'border-red-500';

              return (
                <div key={`${q.q_id}-${index}`} className={`${bgColor} border-l-4 ${borderColor} p-4 rounded-r-lg`}>
                  <p className="font-semibold">{q.q_id}. {q.content}</p>
                  <p className={'text-sm mt-2 ' + (isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200')}>
                    Your answer: <span className="font-bold">{userAnswer || 'Not answered'}</span>
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-gray-800 dark:text-gray-200">Correct answer: <span className="font-bold">{q.correct_answer}</span></p>
                  )}
                  <div className="mt-3">
                    {isLoadingMentor[q.q_id] ? <Spinner /> : (
                      mentorResponse[q.q_id] ? (
                        <div className="text-sm p-3 bg-gray-100 dark:bg-gray-700 rounded-md prose prose-sm max-w-none">
                          <p>{mentorResponse[q.q_id]}</p>
                        </div>
                      ) : (
                        <button onClick={() => handleGetExplanation(q)} className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                          Ask AI Mentor for Explanation
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
                        {weakTopics.length > 0 && !isLoading && (
          <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <h3 className="text-xl font-bold font-display mb-2">Personalized Practice</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">We noticed you had some trouble with the following topics: <span className="font-semibold">{weakTopics.join(', ')}</span>. Would you like to generate a new practice exam focused on these areas?</p>
            <button 
              onClick={handleGeneratePracticeExam}
              disabled={isGeneratingExam}
              className="bg-yellow-500 text-white font-bold py-2 px-6 rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center">
              {isGeneratingExam ? <><Spinner /> Generating...</> : 'Create Practice Exam'}
            </button>
          </div>
        )}

        <div className="text-center mt-8">
          <Link to="/student" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
            Back to Exam Library
          </Link>
        </div>
      </div>
    </div>
  );
}
