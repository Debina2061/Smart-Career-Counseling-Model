import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown, FaSignOutAlt, FaUserCog } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

function StudentProfileDropdown({
  name = 'Student',
  email = 'student@demo.com',
  avatar,
  className = '',
}) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fallbackAvatar =
    avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      email || name || 'Student',
    )}`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 pl-2 pr-2.5 py-1.5 hover:bg-slate-50 transition-colors"
      >
        <img
          src={fallbackAvatar}
          alt={name}
          className="h-8 w-8 rounded-full border border-slate-200 object-cover"
        />
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold text-slate-900 leading-tight max-w-36 truncate">{name}</p>
          <p className="text-xs text-slate-500 max-w-36 truncate">{email}</p>
        </div>
        <FaChevronDown
          className={`text-xs text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
            <p className="text-xs text-slate-400 truncate">{email}</p>
          </div>

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium"
          >
            <FaUserCog className="text-slate-400" />
            Profile & Settings
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium"
          >
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default StudentProfileDropdown;
