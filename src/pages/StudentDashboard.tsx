import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Exam, ExamResult, Question } from '../types/exam';
import ExamList from '../components/ExamList';
import Spinner from '../components/Spinner';
import { generateReinforcementExam } from '../services/geminiService';

export default function StudentDashboard() {
    const { currentUser } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [completedExamIds, setCompletedExamIds] = useState<Set<string>>(new Set());
    const [weakTopics, setWeakTopics] = useState<Record<string, number>>({});
  const [inProgressExams, setInProgressExams] = useState<Record<string, any>>({});
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [examTab, setExamTab] = useState<'my' | 'all' | 'logs'>('all');
    const [activities, setActivities] = useState<any[]>([]);
    const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const navigate = useNavigate();

  const myExams = exams.filter(exam => completedExamIds.has(exam.id) || inProgressExams[exam.id]);
  const allExams = exams;

  const fetchLogs = async () => {
    if (!currentUser) return;
    setIsFetchingLogs(true);
    try {
      const q = query(collection(db, 'user_activity'), where('userId', '==', currentUser.id));
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(logs.sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    } catch (error) {
      console.error("Error fetching logs: ", error);
    } finally {
      setIsFetchingLogs(false);
    }
  };

  useEffect(() => {
    if (examTab === 'logs') {
      fetchLogs();
    }
  }, [examTab]);

    useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        // 1. Fetch all available exams
        const examsQuerySnapshot = await getDocs(collection(db, 'exams'));
        const examsData = examsQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
        setExams(examsData);

        // 2. Fetch results for the current student
        const resultsRef = collection(db, 'results');
        const q = query(resultsRef, where('studentId', '==', currentUser.id));
        const resultsQuerySnapshot = await getDocs(q);
        const resultsData = resultsQuerySnapshot.docs.map(doc => doc.data() as ExamResult);
        
        // 3. Create a set of completed exam IDs for quick lookup
                const completedIds = new Set(resultsData.map(result => result.examId));
        setCompletedExamIds(completedIds);

        // 4. Analyze results to find weak topics
        const topicMistakes: Record<string, number> = {};
        resultsData.forEach(result => {
          const exam = examsData.find(e => e.id === result.examId);
          if (!exam) return;

          exam.questions.forEach(q => {
            const userAnswer = result.answers[q.q_id];
            const correctAnswer = q.correct_answer;
            const isCorrect = userAnswer === correctAnswer || (userAnswer && correctAnswer && userAnswer.startsWith(correctAnswer));
            
            if (!isCorrect) {
              const topic = q.topic_tag || 'General';
              topicMistakes[topic] = (topicMistakes[topic] || 0) + 1;
            }
          });
        });
                setWeakTopics(topicMistakes);

        // 5. Fetch in-progress exams
        const inProgressQuerySnapshot = await getDocs(collection(db, 'in_progress_exams'));
        const inProgressData: Record<string, any> = {};
        inProgressQuerySnapshot.docs.forEach(doc => {
          if (doc.id.startsWith(currentUser.id)) {
            const examId = doc.id.split('_')[1];
            inProgressData[examId] = doc.data();
          }
        });
        setInProgressExams(inProgressData);

      } catch (error) { 
        console.error("Error fetching student data: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
      }, [currentUser]);

  const handleCreateComprehensiveExam = async () => {
    const allWeakTopics = Object.keys(weakTopics);
    if (allWeakTopics.length === 0) return;

    setIsGeneratingExam(true);
    try {
      // Use AI to generate NEW questions based on weak topics
      const practiceQuestions = await generateReinforcementExam(allWeakTopics, 10);

      if (practiceQuestions.length === 0) {
        alert('AI failed to generate questions. Please try again.');
        return;
      }

      const examId = `PRACTICE_COMPREHENSIVE_${Date.now()}`;
      const newExamData = {
        id: examId,
        exam_metadata: {
          exam_id: examId,
          title: `Ôn tập tổng hợp (AI Đề xuất)`,
          exam_type: 'TYPE_AI_GENERATED',
          status: 'verified',
          createdBy: 'AI_SYSTEM',
          createdAt: new Date().toISOString(),
        },
        questions: practiceQuestions,
      };

      await setDoc(doc(db, "exams", examId), newExamData);
      await addDoc(collection(db, 'user_activity'), { 
        userId: currentUser?.id, 
        action: 'create_ai_exam', 
        examId: examId, 
        examTitle: newExamData.exam_metadata.title,
        timestamp: serverTimestamp() 
      });
      alert(`Đề ôn tập tổng hợp đã được tạo thành công!`);
      navigate(`/exam/${examId}`);

    } catch (error) {
      console.error("Error creating comprehensive exam: ", error);
      alert('An error occurred while creating your exam.');
    } finally {
      setIsGeneratingExam(false);
    }
  };

  const handleCreatePracticeExam = async (topic: string) => {
    setIsGeneratingExam(true);
    try {
      // Use AI to generate NEW questions based on the specific topic
      const practiceQuestions = await generateReinforcementExam([topic], 10);

      if (practiceQuestions.length === 0) {
        alert('AI failed to generate questions for this topic.');
        return;
      }

      const examId = `PRACTICE_TOPIC_${Date.now()}`;
      const newExamData = {
        id: examId,
        exam_metadata: {
          exam_id: examId,
          title: `Luyện tập: ${topic} (AI Đề xuất)`,
          exam_type: 'TYPE_AI_GENERATED',
          answer_key_source: 'ai_extracted',
          status: 'verified',
          createdBy: 'AI_SYSTEM',
          createdAt: new Date().toISOString(),
        },
        questions: practiceQuestions,
      };

      // 3. Save the new exam to Firestore
      await setDoc(doc(db, "exams", examId), newExamData);
      await addDoc(collection(db, 'user_activity'), { 
        userId: currentUser?.id, 
        action: 'create_ai_exam', 
        examId: examId, 
        examTitle: newExamData.exam_metadata.title,
        timestamp: serverTimestamp() 
      });
      alert(`Đề luyện tập cho chủ đề '${topic}' đã được tạo thành công!`);
      navigate(`/exam/${examId}`);

    } catch (error) {
      console.error("Error creating practice exam: ", error);
      alert('An error occurred while creating your practice exam.');
    } finally {
      setIsGeneratingExam(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold font-display">Welcome, {currentUser?.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">Your available exams are listed below.</p>
        </div>
      </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="space-y-12">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold font-display">Exams</h2>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                  <button
                    onClick={() => setExamTab('my')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${examTab === 'my' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    My Exams
                  </button>
                  <button
                    onClick={() => setExamTab('all')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${examTab === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Tất cả đề thi
                  </button>
                  <button
                    onClick={() => setExamTab('logs')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${examTab === 'logs' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Activity Log
                  </button>
                </div>
              </div>
              {examTab !== 'logs' ? (
                <ExamList 
                  exams={examTab === 'my' ? myExams : allExams} 
                  userType="student" 
                  completedExamIds={completedExamIds} 
                  inProgressExams={inProgressExams} 
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {activities.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {log.action || log.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {log.examTitle || 'N/A'} {log.score !== undefined ? `(${log.score}/${log.totalQuestions})` : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {log.timestamp?.toDate().toLocaleString() || log.loginAt?.toDate().toLocaleString() || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {Object.keys(weakTopics).length > 0 && (
              <div>
                                <h2 className="text-xl font-bold font-display mb-4">Targeted Practice</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Practice specific topics where you've made mistakes.</p>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                                    <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                    <h3 className="font-semibold">Comprehensive Review</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">Create a single exam covering all your areas for improvement.</p>
                    <button 
                      onClick={handleCreateComprehensiveExam}
                      disabled={isGeneratingExam}
                      className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                      {isGeneratingExam ? <Spinner /> : 'Create Comprehensive Exam'}
                    </button>
                  </div>
                  <ul className="space-y-4">
                    {Object.entries(weakTopics).map(([topic, count]) => (
                      <li key={topic} className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{topic}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{count} incorrect answers</p>
                        </div>
                        <button 
                          onClick={() => handleCreatePracticeExam(topic)}
                          disabled={isGeneratingExam}
                          className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors text-sm disabled:opacity-50">
                          {isGeneratingExam ? <Spinner /> : 'Practice this topic'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
