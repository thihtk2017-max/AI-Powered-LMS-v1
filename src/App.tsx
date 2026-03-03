/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import TeacherDashboard from './pages/TeacherDashboard';
import GradingInsights from './pages/GradingInsights';
import StudentDashboard from './pages/StudentDashboard';
import ExamTaking from './pages/ExamTaking';
import ExamResults from './pages/ExamResults';
import ExamEditor from './pages/ExamEditor';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={currentUser ? <Navigate to={currentUser.role === 'teacher' ? '/teacher' : '/student'} replace /> : <LoginPage />} />
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/edit/:examId" element={<ProtectedRoute role="teacher"><ExamEditor /></ProtectedRoute>} />
      <Route path="/teacher/insights" element={<ProtectedRoute role="teacher"><GradingInsights /></ProtectedRoute>} />
      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/exam/:examId" element={<ProtectedRoute role="student"><ExamTaking /></ProtectedRoute>} />
            <Route path="/results/:resultId" element={<ProtectedRoute role="student"><ExamResults /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <AppRoutes />
        </Layout>
      </AuthProvider>
    </Router>
  );
}

