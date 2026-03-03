import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import UploadZone from '../components/UploadZone';
import DocumentViewer from '../components/DocumentViewer';
import QuestionEditor from '../components/QuestionEditor';
import { Question } from '../types/exam';
import { extractQuestionsFromExam } from '../services/geminiService';
import Spinner from '../components/Spinner';
import QuickAnswerMatrix from '../components/QuickAnswerMatrix';
import { FilePlus2, BarChart3 } from 'lucide-react';
import { collection, getDocs, doc, setDoc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import GradingCenter from './GradingCenter';
import AIInsights from './AIInsights';
import { Exam } from '../types/exam';
import ExamList from '../components/ExamList';

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
    const [verifiedAnswers, setVerifiedAnswers] = useState<Record<string, string>>({});
  const [exams, setExams] = useState<Exam[]>([]);
  const [isFetchingExams, setIsFetchingExams] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'insights' | 'logs'>('my');
  const [activities, setActivities] = useState<any[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);

  const myExams = exams.filter(e => e.exam_metadata.createdBy === currentUser?.id);
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
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

      const handleFileAccepted = async (file: File) => {
    setUploadedFile(file);
    setIsLoading(true);
    setExtractedQuestions([]);
    setVerifiedAnswers({});
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Gemini API key is missing. Please configure it in the environment variables.');
      }
      const questions = await extractQuestionsFromExam(file);
      setExtractedQuestions(questions);
      // Pre-fill verified answers with AI suggestions
      const initialAnswers: Record<string, string> = {};
      questions.forEach(q => {
        if (q.correct_answer) {
          initialAnswers[q.q_id] = q.correct_answer;
        }
      });
      setVerifiedAnswers(initialAnswers);
    } catch (error: any) {
            console.error('Failed to extract questions:', error);
      alert(`Failed to process the document: ${error.message || 'Unknown error'}. Please ensure your Gemini API key is configured correctly in the environment variables.`);
    } finally {
      setIsLoading(false);
    }
  };

    const handleVerifyAnswers = (answers: Record<string, string>) => {
    setVerifiedAnswers(answers);
  };

      const fetchExams = async () => {
    setIsFetchingExams(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'exams'));
      const examsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      setExams(examsData);
    } catch (error) {
      console.error("Error fetching exams: ", error);
    } finally {
      setIsFetchingExams(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleFinalizeAndSave = async () => {
    if (!uploadedFile) return;

    const examId = `DE_${Date.now()}`;
    const finalExamData = {
      exam_metadata: {
        exam_id: examId,
        title: uploadedFile.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        exam_type: 'TYPE_STRUCTURED',
        answer_key_source: 'manual_entry',
        status: 'verified',
        createdBy: currentUser?.id,
        createdAt: new Date().toISOString(),
      },
      questions: extractedQuestions.map(q => ({
        ...q,
        correct_answer: verifiedAnswers[q.q_id] || '', // Ensure teacher's answer is saved
      }))
    };

    try {
      // Add a new document in collection "exams"
      await setDoc(doc(db, "exams", examId), finalExamData);
      await addDoc(collection(db, "user_activity"), {
        userId: currentUser?.id,
        action: 'create_exam',
        examId: examId,
        examTitle: finalExamData.exam_metadata.title,
        timestamp: serverTimestamp()
      });
      alert(`Exam saved successfully to Firestore with ID: ${examId}`);
      
      // Reset state to start over
      setUploadedFile(null);
      setExtractedQuestions([]);
      setVerifiedAnswers({});
      fetchExams(); // Re-fetch exams to update the list

    } catch (e) {
      console.error("Error adding document: ", e);
      alert('Error saving exam. Check the console for details. Make sure your Firebase credentials are correct.');
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome, {currentUser?.name}</h1>
            <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto">
              <button
                onClick={() => setActiveTab('my')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'my' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                My Exams
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'insights' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Tất cả đề thi
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'logs' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Activity Log
              </button>
            </div>
        </div>
            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'my' && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FilePlus2 className="h-6 w-6 text-indigo-600" />
                Exam Creator
              </h2>
            </div>

            <div>
              {!uploadedFile ? (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 font-display">Smart Upload & Parser</h2>
                  <p className="mt-1 text-sm text-gray-600">Step 1: Upload your exam file. AI will do the heavy lifting.</p>
                                <div className="mt-6">
                    <UploadZone onFileAccepted={handleFileAccepted} />
                  </div>

                  <div className="mt-12">
                    <h3 className="text-xl font-bold font-display text-gray-800 mb-4">My Exam Library</h3>
                    {isFetchingExams ? (
                      <Spinner />
                    ) : (
                      <ExamList 
                        exams={myExams} 
                        userType="teacher" 
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 font-display">Step 2 & 3: Verify & Finalize</h2>
                  <p className="mt-1 text-sm text-gray-600">Review questions, provide correct answers, and save the exam.</p>
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <DocumentViewer file={uploadedFile} />
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full bg-white rounded-lg shadow-md"><Spinner /></div>
                    ) : (
                      <QuestionEditor 
                        questions={extractedQuestions} 
                        verifiedAnswers={verifiedAnswers}
                        onOpenMatrix={() => setIsMatrixOpen(true)} 
                        onVerify={handleVerifyAnswers}
                      />
                    )}
                  </div>
                  <div className="mt-8 flex justify-end gap-4">
                    <button 
                      onClick={() => {
                        setUploadedFile(null);
                        setExtractedQuestions([]);
                        setVerifiedAnswers({});
                      }}
                      className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-8 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                      Quay lại
                    </button>
                    <button 
                      onClick={handleFinalizeAndSave}
                      disabled={isLoading || extractedQuestions.length === 0}
                      className="bg-green-600 text-white font-bold py-3 px-8 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                      Finalize & Save Exam
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'all' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-display mb-6">Tất cả đề thi</h2>
            {isFetchingExams ? (
              <Spinner />
            ) : (
              <ExamList 
                exams={allExams} 
                userType="teacher" 
                showTakeButton={false}
                editButtonLabel="Xem"
              />
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-8">
            <GradingCenter />
            <AIInsights />
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-display mb-6">Activity Log</h2>
            {isFetchingLogs ? (
              <Spinner />
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
                          {log.examTitle || 'N/A'}
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
        )}
      </main>
            {extractedQuestions.length > 0 && (
        <QuickAnswerMatrix 
          isOpen={isMatrixOpen}
          onClose={() => setIsMatrixOpen(false)}
          questions={extractedQuestions}
          onVerify={handleVerifyAnswers}
        />
      )}
    </div>
  );
}
