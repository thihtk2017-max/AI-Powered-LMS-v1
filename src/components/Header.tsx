import { BookCopy } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <BookCopy className="h-7 w-7 text-indigo-600" />
            <h1 className="text-xl font-bold font-display text-gray-800">AI-Powered LMS</h1>
          </div>
          <div className="text-sm font-medium text-gray-500">
            Teacher Dashboard
          </div>
        </div>
      </div>
    </header>
  );
}
