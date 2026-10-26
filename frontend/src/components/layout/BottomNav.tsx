import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Send, QrCode, History, Landmark } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navItems = [
    { label: 'Home', path: '/', icon: LayoutDashboard },
    { label: 'Pay', path: '/pay', icon: Send },
    { label: 'Scan', path: '/qr', icon: QrCode, isCenter: true },
    { label: 'History', path: '/transactions', icon: History },
    { label: 'Banks', path: '/accounts', icon: Landmark },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isCenter) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center -mt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-full transition-transform active:scale-95 ${
                    isActive ? 'scale-105' : ''
                  }`
                }
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-4 ring-white">
                  <Icon size={22} className="stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-semibold text-slate-800 mt-0.5">Scan</span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors min-w-[54px] ${
                  isActive ? 'text-indigo-600 font-bold' : 'text-slate-500 font-medium hover:text-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
                  <span className="text-[10px] tracking-tight mt-1">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
