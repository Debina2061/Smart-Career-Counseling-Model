import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBars,
  FaBell,
  FaCheckCircle,
  FaChevronDown,
  FaExclamationCircle,
  FaInfoCircle,
  FaSignOutAlt,
  FaTrash,
  FaUserCog,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useAdminNotification } from '../context/AdminNotificationContext';
import AdminSidebar from './AdminSidebar';

const typeConfig = {
  success: {
    icon: FaCheckCircle,
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-800',
    iconColor: 'text-emerald-500',
    badge: 'bg-emerald-500',
  },
  error: {
    icon: FaExclamationCircle,
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-800',
    iconColor: 'text-rose-500',
    badge: 'bg-rose-500',
  },
  info: {
    icon: FaInfoCircle,
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-500',
    badge: 'bg-blue-500',
  },
};

function timeAgo(date) {
  if (!date) return 'Just now';
  const timestamp = new Date(date);
  if (Number.isNaN(timestamp.getTime())) return 'Just now';

  const seconds = Math.floor((new Date() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join('');
}

function AdminLayout({ title, eyebrow, subtitle, children, actions }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, clearAll } =
    useAdminNotification();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Admin';
  const displayEmail = user?.email || 'admin@demo.com';
  const initials = getInitials(displayName) || 'AD';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfile(false);
        setMobileSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleOpenNotifications = () => {
    setShowNotifications((prev) => {
      if (!prev) markAllRead();
      return !prev;
    });
  };

  // Toast notifications (top-right floating near bell)
  const visibleToasts = notifications.filter((n) => !n.hidden);

  return (
    <div className="min-h-screen bg-[#f4f6fa] overflow-x-hidden">
      <AdminSidebar
        isMobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {mobileSidebarOpen && (
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      <div className="relative min-h-screen lg:ml-68 flex flex-col">
        {/* Toast notifications anchored to top-right near bell */}
        <div className="fixed top-20 right-4 sm:right-8 z-100 flex flex-col gap-3 pointer-events-none w-88 max-w-[calc(100%-2rem)]">
          {visibleToasts.slice(0, 5).map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.info;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-500 ${
                  n.dismissed
                    ? 'opacity-0 translate-x-8'
                    : 'opacity-100 translate-x-0 animate-slideIn'
                } ${cfg.bg}`}
              >
                <Icon className={`text-lg mt-0.5 shrink-0 ${cfg.iconColor}`} />
                <p className={`text-sm font-medium flex-1 ${cfg.text}`}>
                  {n.message}
                </p>
              </div>
            );
          })}
        </div>

        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden h-10 w-10 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Open sidebar"
              >
                <FaBars className="mx-auto" />
              </button>

              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-400">
                  {eyebrow || 'Overview'}
                </p>
                <h2 className="text-3xl font-bold text-slate-900 leading-tight truncate">
                  {title}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {subtitle || 'Monitor platform performance and user activity'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {actions}

              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  className="relative h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                  aria-label="Notifications"
                  onClick={handleOpenNotifications}
                >
                  <FaBell className="mx-auto text-base" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 flex items-center justify-center px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-[20rem] sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">
                          Notifications
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {notifications.length === 0
                            ? 'No notifications yet'
                            : `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAll}
                          className="text-xs font-medium text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
                        >
                          <FaTrash className="text-[10px]" />
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                          <FaBell className="text-3xl text-slate-200 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">
                            All caught up! No new notifications.
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const cfg = typeConfig[n.type] || typeConfig.info;
                          const Icon = cfg.icon;

                          return (
                            <div
                              key={n.id}
                              className={`px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/80 transition-colors ${
                                !n.read ? 'bg-slate-50/40' : ''
                              }`}
                            >
                              <span
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  n.type === 'error'
                                    ? 'bg-rose-100'
                                    : n.type === 'success'
                                    ? 'bg-emerald-100'
                                    : 'bg-blue-100'
                                }`}
                              >
                                <Icon className={`text-sm ${cfg.iconColor}`} />
                              </span>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-800 font-medium leading-snug">
                                  {n.message}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                  {timeAgo(n.time)}
                                </p>
                              </div>

                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setShowProfile((prev) => !prev)}
                  className="flex items-center gap-2 sm:gap-3 rounded-xl border border-slate-200 pl-2 pr-2.5 py-1.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-slate-900 leading-tight truncate max-w-36">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate max-w-36">
                      {displayEmail}
                    </p>
                  </div>

                  <span className="h-10 w-10 rounded-full bg-slate-800 text-white text-sm font-bold flex items-center justify-center">
                    {initials}
                  </span>
                  <FaChevronDown className="hidden sm:block text-slate-400 text-xs" />
                </button>

                {showProfile && (
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                      <p className="text-sm font-semibold text-slate-900">
                        {displayName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {displayEmail}
                      </p>
                    </div>
                    <Link
                      to="/admin/profile"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                    >
                      <FaUserCog className="text-slate-400" />
                      Profile & Settings
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                    >
                      <FaSignOutAlt />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="admin-scope flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
