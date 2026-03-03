import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError('Please enter both name and password.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('name', '==', name.trim()));
      const querySnapshot = await getDocs(q);

      if (isSignUp) {
        if (!querySnapshot.empty) {
          setError('A user with this name already exists. Please choose a different name.');
        } else {
          // New user, create account
          const newUser = { name: name.trim(), password: password.trim(), role };
          const docRef = await addDoc(usersRef, newUser);
          login({ id: docRef.id, ...newUser });
          await addDoc(collection(db, 'user_activity'), { userId: docRef.id, loginAt: serverTimestamp(), type: 'signup' });
          navigate(role === 'teacher' ? '/teacher' : '/student');
        }
      } else {
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          if (userData.password === password.trim()) {
            if (userData.role === role) {
              login({ id: userDoc.id, ...userData } as any);
              await addDoc(collection(db, 'user_activity'), { userId: userDoc.id, loginAt: serverTimestamp(), type: 'login' });
              navigate(role === 'teacher' ? '/teacher' : '/student');
            } else {
              setError(`The account exists but with a different role (${userData.role}).`);
            }
          } else {
            setError('Incorrect password.');
          }
        } else {
          setError('User not found. Please sign up if you don\'t have an account.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold font-display text-center text-gray-800 dark:text-white mb-6">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        <form onSubmit={handleAuth}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
              placeholder="e.g., Jane Doe"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" id="password-label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
              placeholder="••••••••"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Your Role</label>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                type="button"
                id="role-teacher"
                onClick={() => setRole('teacher')}
                className={`flex-1 p-3 text-sm font-semibold transition-colors ${
                  role === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}>
                Teacher
              </button>
              <button
                type="button"
                id="role-student"
                onClick={() => setRole('student')}
                className={`flex-1 p-3 text-sm font-semibold transition-colors ${
                  role === 'student' ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}>
                Student
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
          <button
            type="submit"
            id="auth-submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? <Spinner /> : (isSignUp ? 'Sign Up' : 'Login')}
          </button>
          <div className="mt-4 text-center">
            <button
              type="button"
              id="auth-toggle"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-indigo-600 hover:underline"
            >
              {isSignUp ? 'Already have an account? Login' : 'Don\'t have an account? Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
