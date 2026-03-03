import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import Spinner from '../components/Spinner';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  submittedAt: any;
}

interface StudentRanking {
  studentId: string;
  studentName: string;
  averageScore: number;
  examsTaken: number;
  totalPoints: number;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Auto-Graded':
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{status}</span>;
    case 'Pending AI Review':
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">{status}</span>;
    default:
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
  }
};

export default function GradingCenter() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch all results
        const resultsQuery = query(collection(db, 'results'), orderBy('submittedAt', 'desc'));
        const resultsSnapshot = await getDocs(resultsQuery);
        const allResults = resultsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Submission[];

        setSubmissions(allResults.slice(0, 10)); // Show last 10 submissions in the table

        // 2. Calculate Rankings
        const studentData: Record<string, { name: string; exams: Record<string, number> }> = {};

        allResults.forEach(res => {
          if (!studentData[res.studentId]) {
            studentData[res.studentId] = { name: res.studentName, exams: {} };
          }
          
          // Only keep the latest score for each exam
          // Since results are ordered by submittedAt desc, the first one we encounter for an exam is the latest
          if (studentData[res.studentId].exams[res.examId] === undefined) {
            // Calculate percentage score (0-10 scale)
            const percentageScore = (res.score / res.totalQuestions) * 10;
            studentData[res.studentId].exams[res.examId] = percentageScore;
          }
        });

        const calculatedRankings: StudentRanking[] = Object.entries(studentData).map(([id, data]) => {
          const scores = Object.values(data.exams);
          const totalPoints = scores.reduce((sum, s) => sum + s, 0);
          const examsTaken = scores.length;
          const averageScore = examsTaken > 0 ? totalPoints / examsTaken : 0;

          return {
            studentId: id,
            studentName: data.name,
            averageScore: Number(averageScore.toFixed(2)),
            examsTaken,
            totalPoints: Number(totalPoints.toFixed(2))
          };
        });

        // Sort by average score descending
        setRankings(calculatedRankings.sort((a, b) => b.averageScore - a.averageScore).slice(0, 10));

      } catch (error) {
        console.error("Error fetching grading data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  return (
    <div className="space-y-8">
      {/* Top 10 Students Ranking */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Trophy className="text-yellow-600 dark:text-yellow-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Bảng Xếp Hạng Top 10</h3>
            <p className="text-sm text-gray-500">Học sinh có điểm trung bình cao nhất (tính theo lần làm bài cuối)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rankings.map((student, index) => {
            let Icon = Award;
            let colorClass = "text-gray-400";
            let bgClass = "bg-gray-50 dark:bg-gray-700/30";

            if (index === 0) {
              Icon = Trophy;
              colorClass = "text-yellow-500";
              bgClass = "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800";
            } else if (index === 1) {
              Icon = Medal;
              colorClass = "text-slate-400";
              bgClass = "bg-slate-50 dark:bg-slate-700/20 border-slate-100 dark:border-slate-800";
            } else if (index === 2) {
              Icon = Medal;
              colorClass = "text-amber-600";
              bgClass = "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800";
            }

            return (
              <div key={student.studentId} className={`flex items-center p-4 rounded-xl border transition-all hover:shadow-md ${bgClass}`}>
                <div className="flex-shrink-0 mr-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${index < 3 ? 'bg-white dark:bg-gray-800 shadow-sm' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className="absolute -top-2 -right-2">
                      <Icon className={colorClass} size={18} />
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <h4 className="font-bold text-gray-900 dark:text-white truncate">{student.studentName}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                      <TrendingUp size={12} />
                      <span>{student.averageScore}/10</span>
                    </div>
                    <span className="text-[10px] text-gray-500">({student.examsTaken} bài thi)</span>
                  </div>
                </div>
              </div>
            );
          })}
          {rankings.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-500 italic">
              Chưa có dữ liệu xếp hạng.
            </div>
          )}
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Grading Center (Recent Submissions)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exam</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{submission.studentName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{submission.examTitle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {((submission.score / submission.totalQuestions) * 10).toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">/10</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusBadge('Auto-Graded')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {submission.submittedAt?.toDate().toLocaleString() || 'N/A'}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                    Chưa có bài nộp nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
