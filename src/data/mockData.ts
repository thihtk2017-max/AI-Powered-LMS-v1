export const mockSubmissions = [
  { id: 1, studentName: 'Nguyễn Văn An', score: 8.5, status: 'Auto-Graded' },
  { id: 2, studentName: 'Trần Thị Bình', score: 9.0, status: 'Auto-Graded' },
  { id: 3, studentName: 'Lê Hoàng Cường', score: null, status: 'Pending AI Review' },
  { id: 4, studentName: 'Phạm Mỹ Duyên', score: 7.0, status: 'Auto-Graded' },
  { id: 5, studentName: 'Võ Thanh Giang', score: 6.5, status: 'Auto-Graded' },
];

export const mockProgressData = [
  { name: 'Week 1', avgScore: 6.8 },
  { name: 'Week 2', avgScore: 7.2 },
  { name: 'Week 3', avgScore: 7.1 },
  { name: 'Week 4', avgScore: 7.8 },
  { name: 'Week 5', avgScore: 8.1 },
];

export const mockKnowledgeGaps = [
  { topic: 'Tích phân', failureRate: 0.65 },
  { topic: 'Lượng giác', failureRate: 0.58 },
];

export const mockExamQuestions = {
  'DE_001': [
    { q_id: '1', content: 'Tính đạo hàm của hàm số y = x^3 - 3x + 1.', options: ['A. y_prime = 3x^2 - 3', 'B. y_prime = 3x^2', 'C. y_prime = x^2 - 3', 'D. y_prime = 3x'], topic_tag: 'Đạo hàm', correct_answer: 'A' },
    { q_id: '2', content: 'Hàm số y = x^4 - 2x^2 đồng biến trên khoảng nào?', options: ['A. (-1, 0)', 'B. (1, +∞)', 'C. (-∞, -1)', 'D. (A) và (B) đều đúng'], topic_tag: 'Khảo sát hàm số', correct_answer: 'D' },
    { q_id: '3', content: 'Giá trị lớn nhất của hàm số y = -x^3 + 3x^2 - 1 trên [-1, 1] là?', options: ['A. 1', 'B. 2', 'C. 3', 'D. -1'], topic_tag: 'Giá trị lớn nhất/nhỏ nhất', correct_answer: 'A' },
  ],
  'DE_002': [
    { q_id: '1', content: 'Nguyên hàm của hàm số f(x) = sin(x) là?', options: ['A. cos(x) + C', 'B. -cos(x) + C', 'C. sin(2x) + C', 'D. -sin(x) + C'], topic_tag: 'Nguyên hàm', correct_answer: 'B' },
  ]
};

export const mockExams = [
  {
    id: 'DE_001',
    title: 'Kiểm tra 15p Chương 1: Đạo hàm',
    subject: 'Toán 12',
    questionCount: 10,
    timeLimit: 15, // minutes
  },
  {
    id: 'DE_002',
    title: 'Kiểm tra 45p Chương 3: Nguyên hàm',
    subject: 'Toán 12',
    questionCount: 25,
    timeLimit: 45,
  },
  {
    id: 'DE_003',
    title: 'Thi thử THPT Quốc Gia 2024',
    subject: 'Toán 12',
    questionCount: 50,
    timeLimit: 90,
  },
];
