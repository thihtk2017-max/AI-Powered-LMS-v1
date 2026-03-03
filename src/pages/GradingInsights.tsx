import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Exam, ExamResult, User } from '../types/exam';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Spinner from '../components/Spinner';

interface ActivityStats {
  dau: number;
    mau: number;
}

interface LearnerProgress {
  studentId: string;
  studentName: string;
  completedExams: number;
  overdueExams: string[];
}

interface ExamStats {
  id: string;
  title: string;
    completions: number;
  scoreDistribution: { name: string; count: number }[];
    averageTimeSpent: number; // in minutes
  questionAnalysis: { q_id: string; content: string; correctPercentage: number }[];
}

export default function GradingInsights() {
  const [stats, setStats] = useState<ExamStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activity, setActivity] = useState<ActivityStats>({ dau: 0, mau: 0 });
      const [progress, setProgress] = useState<LearnerProgress[]>([]);
  const [mostPopularExam, setMostPopularExam] = useState<string | null>(null);
  const [students, setStudents] = useState<User[]>([]);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        const examsData = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
        
                const resultsSnapshot = await getDocs(collection(db, 'results'));
                const resultsData = resultsSnapshot.docs.map(doc => doc.data() as ExamResult);

        const usersSnapshot = await getDocs(collection(db, 'users'));
                const studentsData = usersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as User))
          .filter(user => user.role === 'student');
        setStudents(studentsData);

        // Calculate User Activity (DAU/MAU)
        const activitySnapshot = await getDocs(collection(db, 'user_activity'));
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const dailyActiveUsers = new Set();
        const monthlyActiveUsers = new Set();

        activitySnapshot.docs.forEach(doc => {
          const activityData = doc.data();
          const loginDate = activityData.loginAt.toDate();
          if (loginDate >= oneDayAgo) {
            dailyActiveUsers.add(activityData.userId);
          }
          if (loginDate >= thirtyDaysAgo) {
            monthlyActiveUsers.add(activityData.userId);
          }
        });
                setActivity({ dau: dailyActiveUsers.size, mau: monthlyActiveUsers.size });

        // Calculate Learner Progress
        const learnerProgress: LearnerProgress[] = studentsData.map(student => {
          const completedExams = resultsData.filter(r => r.studentId === student.id);
          const overdueExams: string[] = [];

          examsData.forEach(exam => {
            if (exam.exam_metadata.dueDate) {
              const dueDate = new Date(exam.exam_metadata.dueDate);
              const isCompleted = completedExams.some(r => r.examId === exam.id);
              if (!isCompleted && dueDate < now) {
                overdueExams.push(exam.exam_metadata.title);
              }
            }
          });

          return {
            studentId: student.id,
            studentName: student.name,
            completedExams: completedExams.length,
            overdueExams,
          };
        });
                setProgress(learnerProgress);

                const examStats: ExamStats[] = examsData
          .filter(exam => exam.exam_metadata.exam_type !== 'TYPE_AI_GENERATED') // Filter out practice exams
          .map(exam => {
                        const relevantResults = resultsData.filter(r => r.examId === exam.id);
            const totalTimeSpent = relevantResults.reduce((acc, r) => acc + (r.timeSpent || 0), 0);
                        const averageTimeSpent = relevantResults.length > 0 ? (totalTimeSpent / relevantResults.length) / 60 : 0; // in minutes

            const questionAnalysis = exam.questions.map(q => {
              const correctAnswers = relevantResults.filter(r => r.answers[q.q_id] === q.correct_answer).length;
              const correctPercentage = relevantResults.length > 0 ? (correctAnswers / relevantResults.length) * 100 : 0;
              return {
                q_id: q.q_id,
                content: q.content,
                correctPercentage,
              };
            });
            const scoreDistribution = [
              { name: '0-20%', count: 0 },
              { name: '21-40%', count: 0 },
              { name: '41-60%', count: 0 },
              { name: '61-80%', count: 0 },
              { name: '81-100%', count: 0 },
            ];

            relevantResults.forEach(result => {
              const percentage = (result.score / result.totalQuestions) * 100;
              if (percentage <= 20) scoreDistribution[0].count++;
              else if (percentage <= 40) scoreDistribution[1].count++;
              else if (percentage <= 60) scoreDistribution[2].count++;
              else if (percentage <= 80) scoreDistribution[3].count++;
              else scoreDistribution[4].count++;
            });

            return {
              id: exam.id,
              title: exam.exam_metadata.title,
              completions: relevantResults.length,
                            scoreDistribution,
                            averageTimeSpent,
              questionAnalysis,
            };
          });

                setStats(examStats);

        // Find most popular exam
        if (examStats.length > 0) {
          const mostPopular = examStats.reduce((prev, current) => (prev.completions > current.completions) ? prev : current);
          setMostPopularExam(mostPopular.title);
        }
      } catch (error) {
        console.error("Error fetching insights data: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold font-display text-gray-800 dark:text-white mb-6">Grading & Insights</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold font-display text-indigo-600 dark:text-indigo-400">User Activity</h2>
            <div className="flex justify-around mt-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{activity.dau}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Daily Active Users</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{activity.mau}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Active Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold font-display text-indigo-600 dark:text-indigo-400">Most Popular Exam</h2>
            <div className="flex justify-center items-center h-full mt-4">
              <p className="text-2xl font-bold">{mostPopularExam || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        {stats.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No exam results found to generate insights.</p>
        ) : (
                    <>
            <div className="space-y-8">
              {stats.map(stat => (
                <div key={stat.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-bold font-display text-indigo-600 dark:text-indigo-400">{stat.title}</h2>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.completions} of {students.length} student(s) have completed this exam.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average time spent: {stat.averageTimeSpent.toFixed(2)} minutes</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${(stat.completions / students.length) * 100}%` }}></div>
                  </div>
                  
                                    <div className="mt-6" style={{ height: '300px' }}>
                    <h3 className="text-lg font-semibold mb-2 text-center">Score Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stat.scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#4f46e5" name="Number of Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Question Analysis</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Question</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Correct Rate</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {stat.questionAnalysis.map(q => (
                            <tr key={q.q_id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{q.content}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{q.correctPercentage.toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold font-display text-indigo-600 dark:text-indigo-400 mb-4">Learner Progress</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Student</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Completed Exams</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {progress.map(p => (
                      <tr key={p.studentId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{p.studentName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.completedExams}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">
                          {p.overdueExams.length > 0 ? p.overdueExams.join(', ') : 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
