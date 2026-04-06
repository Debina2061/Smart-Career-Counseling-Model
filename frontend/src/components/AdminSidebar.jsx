import { Link, useLocation } from 'react-router-dom';
import {
  FaChartBar,
  FaCog,
  FaGraduationCap,
  FaKey,
  FaShieldAlt,
  FaSignOutAlt,
  FaThLarge,
  FaTimes,
  FaUsers,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: FaThLarge },
  { path: '/admin/careers', label: 'Career Profiles', icon: FaGraduationCap },
  { path: '/admin/skills', label: 'Skills & Keywords', icon: FaKey },
  { path: '/admin/students', label: 'Student Management', icon: FaUsers },
  { path: '/admin/reports', label: 'Reports & Analytics', icon: FaChartBar },
];

function AdminSidebar({ isMobileOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (path) => location.pathname.startsWith(path);
  const closeOnMobile = () => onClose();

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-68 bg-[#1b2738] border-r border-slate-700/70 flex flex-col text-slate-100 transition-transform duration-300 ease-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-start justify-between gap-3">
          <Link to="/admin/dashboard" className="min-w-0" onClick={closeOnMobile}>
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-300/30 flex items-center justify-center">
                <FaShieldAlt className="text-lg" />
              </span>
              <div>
                <p className="text-base font-semibold text-white leading-tight">Smart Career</p>
                <p className="text-xs text-slate-400 mt-0.5">Admin Portal</p>
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={closeOnMobile}
            className="lg:hidden mt-0.5 h-8 w-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            aria-label="Close sidebar"
          >
            <FaTimes className="mx-auto" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeOnMobile}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                isActive(item.path)
                  ? 'bg-slate-700/60 text-white shadow-[inset_0_0_0_1px_rgba(148,163,184,0.28)]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/35'
              }`}
            >
              <span
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition ${
                  isActive(item.path)
                    ? 'bg-indigo-400/20 text-indigo-100'
                    : 'bg-slate-700/45 text-slate-300 group-hover:text-indigo-100'
                }`}
              >
                <Icon className="text-sm" />
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700/60 space-y-1.5">
        <Link
          to="/admin/profile"
          onClick={closeOnMobile}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
            isActive('/admin/profile')
              ? 'bg-slate-700/60 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-700/35'
          }`}
        >
          <span className="h-9 w-9 rounded-lg bg-slate-700/45 text-slate-300 flex items-center justify-center">
            <FaCog className="text-sm" />
          </span>
          <span className="text-sm font-medium">Profile Settings</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-rose-200 hover:text-rose-100 hover:bg-rose-500/20 transition font-medium"
        >
          <span className="h-9 w-9 rounded-lg bg-rose-500/20 text-rose-200 flex items-center justify-center">
            <FaSignOutAlt className="text-sm" />
          </span>
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;
