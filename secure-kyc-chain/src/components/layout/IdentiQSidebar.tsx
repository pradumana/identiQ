import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Zap,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Settings,
  Menu,
  X,
  XCircle,
  History,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: FileText, label: 'KYC Applications', path: '/admin/applications' },
  { icon: Zap, label: 'Auto Verification', path: '/admin/auto-verification' },
  { icon: ClipboardList, label: 'Review Queue', path: '/admin/review-queue' },
  { icon: CheckCircle, label: 'Approved', path: '/admin/approved' },
  { icon: XCircle, label: 'Rejected', path: '/admin/rejected' },
  { icon: History, label: 'History', path: '/admin/history' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export const IdentiQSidebar = () => {
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-[#0F3B3A] text-white rounded-lg"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 h-full w-20 bg-[#0F3B3A] flex-col items-center py-6 z-10">
        <div className="mb-8">
          <Link to="/admin/dashboard" className="w-10 h-10 bg-[#1DBF59] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">I</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-6 w-full">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative group flex items-center justify-center w-full",
                  "transition-all duration-200"
                )}
              >
                {active && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#1DBF59] rounded-r-full" />
                )}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                    active
                      ? "bg-[#E7F7EC]"
                      : "hover:bg-white/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-colors",
                      active ? "text-[#1DBF59]" : "text-white"
                    )}
                  />
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0F3B3A] border-t border-white/10 z-50">
            <div className="grid grid-cols-4 gap-1 p-2">
              {menuItems.slice(0, 4).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg transition-all",
                      active ? "bg-[#E7F7EC]" : "hover:bg-white/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 mb-1",
                        active ? "text-[#1DBF59]" : "text-white"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs",
                        active ? "text-[#1DBF59]" : "text-white"
                      )}
                    >
                      {item.label.split(' ')[0]}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-1 p-2 border-t border-white/10">
              {menuItems.slice(4).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg transition-all",
                      active ? "bg-[#E7F7EC]" : "hover:bg-white/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 mb-1",
                        active ? "text-[#1DBF59]" : "text-white"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs",
                        active ? "text-[#1DBF59]" : "text-white"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};

