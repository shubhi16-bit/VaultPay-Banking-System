import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MockDataBanner } from '../common/MockDataBanner';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Disclaimer Banner for Mock Data Mode */}
      <MockDataBanner />

      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area with Desktop Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 px-4 sm:px-8 py-6 pb-24 lg:pb-8 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
