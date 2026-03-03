import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Lightbulb, BrainCircuit } from 'lucide-react';
import Spinner from '../components/Spinner';

interface KnowledgeGap {
  topic: string;
  failureRate: number;
  count: number;
}

interface ProgressPoint {
  name: string;
  avgScore: number;
}

export default function AIInsights() {
  const [progressData, setProgressData] = useState<ProgressPoint[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch all results
        const resultsQuery = query(collection(db, 'results'), orderBy('submittedAt', 'asc'));
        const resultsSnapshot = await getDocs(resultsQuery);
        const allResults = resultsSnapshot.docs.map(doc => doc.data());

        // 2. Fetch all exams to get question topics
        const examsSnapshot = await getDocs(collection(db, 'exams'));
        const examsData: Record<string, any> = {};
        examsSnapshot.docs.forEach(doc => {
          examsData[doc.id] = doc.data();
        });

        // 3. Calculate Progress Data (Average score over time/exams)
        const examScores: Record<string, { total: number; count: number; title: string }> = {};
        allResults.forEach(res => {
          if (!examScores[res.examId]) {
            examScores[res.examId] = { total: 0, count: 0, title: res.examTitle };
          }
          const percentage = (res.score / res.totalQuestions) * 10;
          examScores[res.examId].total += percentage;
          examScores[res.examId].count += 1;
        });

        const progress = Object.values(examScores).map(data => ({
          name: data.title.length > 10 ? data.title.substring(0, 10) + '...' : data.title,
          avgScore: Number((data.total / data.count).toFixed(1))
        }));
        setProgressData(progress);

        // 4. Calculate Knowledge Gaps
        const topicStats: Record<string, { wrong: number; total: number }> = {};
        
        allResults.forEach(res => {
          const exam = examsData[res.examId];
          if (!exam || !exam.questions) return;

          exam.questions.forEach((q: any) => {
            const topic = q.topic_tag || 'General';
            if (!topicStats[topic]) {
              topicStats[topic] = { wrong: 0, total: 0 };
            }
            
            topicStats[topic].total += 1;
            const userAnswer = res.answers[q.q_id];
            if (userAnswer !== q.correct_answer) {
              topicStats[topic].wrong += 1;
            }
          });
        });

        const gaps = Object.entries(topicStats)
          .map(([topic, stats]) => ({
            topic,
            failureRate: stats.total > 0 ? stats.wrong / stats.total : 0,
            count: stats.total
          }))
          .filter(gap => gap.failureRate > 0.3) // Only show topics with > 30% failure rate
          .sort((a, b) => b.failureRate - a.failureRate)
          .slice(0, 5);

        setKnowledgeGaps(gaps);

      } catch (error) {
        console.error("Error fetching AI insights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <BrainCircuit className="text-indigo-600 dark:text-indigo-400" size={24} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">AI Insights (Class Analytics)</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h4 className="font-semibold mb-4 text-gray-700 dark:text-gray-300">Average Score Progression</h4>
          <div style={{ width: '100%', height: 300 }}>
            {progressData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgScore" name="Điểm TB" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic">Chưa có dữ liệu tiến độ.</div>
            )}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-4 text-gray-700 dark:text-gray-300">Knowledge Gap Map</h4>
          <div className="space-y-3">
            {knowledgeGaps.length > 0 ? (
              knowledgeGaps.map((gap) => (
                <div key={gap.topic} className="bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-400 p-4 rounded-r-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-orange-800 dark:text-orange-300">{gap.topic}</p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">{(gap.failureRate * 100).toFixed(0)}% học sinh gặp khó khăn ở chủ đề này.</p>
                    </div>
                    <button className="bg-orange-500 text-white text-xs font-bold py-2 px-3 rounded-md hover:bg-orange-600 transition-colors flex items-center gap-1 shadow-sm">
                      <Lightbulb size={14}/>
                      Tạo bài ôn tập
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-400 italic">Không phát hiện hổng kiến thức đáng kể.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
