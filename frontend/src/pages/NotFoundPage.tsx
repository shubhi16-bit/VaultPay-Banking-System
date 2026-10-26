import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-2xl mb-4">
        404
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        The payment screen or resource you are looking for does not exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link to="/">
          <Button leftIcon={<Home size={16} />}>Return Home</Button>
        </Link>
        <Button variant="outline" leftIcon={<ArrowLeft size={16} />} onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    </div>
  );
};
