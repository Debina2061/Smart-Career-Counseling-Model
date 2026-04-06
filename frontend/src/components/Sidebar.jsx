import { Link, useLocation } from 'react-router-dom';
import {
  FaBullseye,
  FaComments,
  FaFilePdf,
  FaGraduationCap,
  FaSearch,
  FaSignOutAlt,
  FaTachometerAlt,
  FaUser,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: FaTachometerAlt },
  { path: '/resume-builder', label: 'Resume Builder', icon: FaFilePdf },
  { path: '/ats-scanner', label: 'ATS Scanner', icon: FaSearch },
  { path: '/career-recommendation', label: 'Career Recommendations', icon: FaBullseye },
  { path: '/ai-chatbot', label: 'AI Chat', icon: FaComments },
  { path: '/profile', label: 'Profile', icon: FaUser },
];

function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-52 flex-col border-r border-slate-200 bg-[#f8fafc]">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#5146ff] text-xs text-white shadow-sm">
            <FaGraduationCap />
          </span>
          <h1 className="text-lg font-bold tracking-tight text-[#5146ff]">Smart Career</h1>
        </Link>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive(item.path)
                  ? 'bg-linear-to-r from-[#4f46e5] to-[#6366f1] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Icon className="text-sm" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
        >
          <FaSignOutAlt className="text-sm" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
