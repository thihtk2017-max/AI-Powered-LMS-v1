import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Bell, UserX, CheckCircle2, AlertCircle } from 'lucide-react';
import Spinner from './Spinner';

interface ExamStats {
  id: string;
  title: string;
  completionRate: number;
  completedCount: number;
  totalStudents: number;
  notCompletedStudents: { id: string; name: string }[];
}

export default function LessonDashboard() {
  const [stats, setStats] = useState<ExamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<ExamStats | null>(null);
  const [reminding, setReminding] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch all students
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        const allStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        const totalStudentsCount = allStudents.length;

        // 2. Fetch all exams
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        const exams = examsSnapshot.docs.map(doc => ({ id: doc.id, title: doc.data().exam_metadata.title }));

        // 3. Fetch all results
        const resultsSnapshot = await getDocs(collection(db, 'exam_results'));
        const allResults = resultsSnapshot.docs.map(doc => doc.data());

        // 4. Calculate stats per exam
        const examStats: ExamStats[] = exams.map(exam => {
          const completedResults = allResults.filter(r => r.examId === exam.id);
          const completedStudentIds = new Set(completedResults.map(r => r.studentId));
          const completedCount = completedStudentIds.size;
          const completionRate = totalStudentsCount > 0 ? (completedCount / totalStudentsCount) * 100 : 0;
          
          const notCompletedStudents = allStudents.filter(s => !completedStudentIds.has(s.id));

          return {
            id: exam.id,
            title: exam.title,
            completionRate: Math.round(completionRate),
            completedCount,
            totalStudents: totalStudentsCount,
            notCompletedStudents
          };
        });

        setStats(examStats);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const examId = data.activePayload[0].payload.id;
      const selected = stats.find(s => s.id === examId);
      if (selected) {
        setSelectedExam(selected);
      }
    }
  };

  const sendReminder = (studentId: string) => {
    setReminding(studentId);
    // Mock reminder sending
    setTimeout(() => {
      setReminding(null);
      alert("Đã gửi thông báo nhắc nhở thành công!");
    }, 1000);
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Lesson-by-Lesson Completion</h3>
            <p className="text-sm text-gray-500">Tỷ lệ hoàn thành bài tập của học sinh theo từng đề thi</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
              <span className="text-gray-600 dark:text-gray-400">Dưới 40%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
              <span className="text-gray-600 dark:text-gray-400">Trên 40%</span>
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={stats} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="title" 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={80}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                domain={[0, 100]} 
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, 'Tỷ lệ hoàn thành']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="completionRate" radius={[4, 4, 0, 0]}>
                {stats.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.completionRate < 40 ? '#ef4444' : '#6366f1'} 
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
                <LabelList dataKey="completionRate" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: '10px', fill: '#6b7280' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4 italic">Nhấn vào cột để xem danh sách học sinh chưa hoàn thành</p>
      </div>

      {selectedExam && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserX className="text-red-500" size={20} />
              <h4 className="font-bold text-gray-800 dark:text-white">
                Học sinh chưa hoàn thành: <span className="text-indigo-600">{selectedExam.title}</span>
              </h4>
            </div>
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
              {selectedExam.notCompletedStudents.length} học sinh
            </span>
          </div>

          {selectedExam.notCompletedStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedExam.notCompletedStudents.map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{student.name}</span>
                  <button 
                    onClick={() => sendReminder(student.id)}
                    disabled={reminding === student.id}
                    className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                  >
                    {reminding === student.id ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Bell size={12} />
                    )}
                    Nhắc nhở
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <CheckCircle2 size={48} className="text-green-500 mb-2 opacity-20" />
              <p>Tuyệt vời! Tất cả học sinh đã hoàn thành bài tập này.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
