import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaBriefcase,
  FaCheckCircle,
  FaFileAlt,
  FaLightbulb,
  FaRegClock,
  FaStar,
  FaUsers,
} from 'react-icons/fa';
import AdminLayout from '../../components/AdminLayout';
import { adminAPI } from '../../utils/api';
import { useAdminNotification } from '../../context/AdminNotificationContext';

function formatNumber(value) {
  return typeof value === 'number' ? value.toLocaleString() : '--';
}

function getInitials(name) {
  return (name || 'NA')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

function timeAgo(value) {
  if (!value) return 'Just now';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const { notify } = useAdminNotification();

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminAPI.getDashboardStats();
        const payload = response?.data || response;
        setStats(payload?.stats || null);
        setRecentUsers(payload?.recent?.users || []);
        setRecentJobs(payload?.recent?.jobs || []);
      } catch (err) {
        notify(err.message || 'Failed to load admin dashboard', 'error');
      }
    };
    load();
  }, []);

  const cards = useMemo(
    () => [
      {
        label: 'Total Users',
        value: formatNumber(stats?.users?.total),
        icon: FaUsers,
        iconTone: 'bg-indigo-50 text-indigo-500',
        change: '+12.5%',
      },
      {
        label: 'Verified Users',
        value: formatNumber(stats?.users?.verified),
        icon: FaCheckCircle,
        iconTone: 'bg-emerald-50 text-emerald-500',
        change: '+8.2%',
      },
      {
        label: 'Active Jobs',
        value: formatNumber(stats?.jobs?.active),
        icon: FaBriefcase,
        iconTone: 'bg-blue-50 text-blue-500',
        change: '+15.3%',
      },
      {
        label: 'Career Profiles',
        value: formatNumber(stats?.careers),
        icon: FaLightbulb,
        iconTone: 'bg-violet-50 text-violet-500',
        change: '+3',
      },
      {
        label: 'Total Resumes',
        value: formatNumber(stats?.resumes),
        icon: FaFileAlt,
        iconTone: 'bg-amber-50 text-amber-500',
        change: '+9.8%',
      },
      {
        label: 'Recommendations',
        value: formatNumber(stats?.recommendations),
        icon: FaStar,
        iconTone: 'bg-pink-50 text-pink-500',
        change: '+22.1%',
      },
    ],
    [stats]
  );

  const userRows = useMemo(() => recentUsers.slice(0, 5), [recentUsers]);
  const jobRows = useMemo(() => recentJobs.slice(0, 5), [recentJobs]);

  const getJobApplications = (job) => {
    if (typeof job?.applicationCount === 'number') return job.applicationCount;
    if (Array.isArray(job?.applicants)) return job.applicants.length;
    return null;
  };

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle="Monitor platform performance and user activity"
      eyebrow="Overview"
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${card.iconTone} flex items-center justify-center`}>
                    <Icon className="text-lg" />
                  </div>
                  <span className="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-600">
                    {card.change}
                  </span>
                </div>

                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-[2rem] font-bold leading-tight text-slate-900 mt-2">
                  {card.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              Recent Users
            </h3>
            <Link
              to="/admin/students"
              className="text-sm text-slate-700 hover:text-slate-900 font-medium inline-flex items-center gap-2"
            >
              View All <FaArrowRight className="text-xs" />
            </Link>
          </div>

          <div className="p-5 space-y-3">
            {userRows.length === 0 ? (
              <p className="text-sm text-slate-500">No recent users found.</p>
            ) : (
              userRows.map((user, index) => {
                const userName = user?.name || 'Unknown User';
                const badgeColor = user?.isVerified
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200';

                return (
                  <article
                    key={user?._id || `${user?.email || 'user'}-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-9 w-9 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(userName)}
                      </span>

                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{userName}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {user?.email || 'No email provided'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-md border border-slate-200 text-slate-500 bg-slate-50">
                        Student
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border ${badgeColor}`}>
                        {user?.isVerified ? 'Verified' : 'Pending'}
                      </span>
                      <span className="text-slate-400 inline-flex items-center gap-1">
                        <FaRegClock className="text-[10px]" />
                        {timeAgo(user?.DateCreated)}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              Recent Job Postings
            </h3>
            <Link
              to="/admin/reports"
              className="text-sm text-slate-700 hover:text-slate-900 font-medium inline-flex items-center gap-2"
            >
              View All <FaArrowRight className="text-xs" />
            </Link>
          </div>

          <div className="p-5 space-y-3">
            {jobRows.length === 0 ? (
              <p className="text-sm text-slate-500">No recent jobs found.</p>
            ) : (
              jobRows.map((job, index) => {
                const applications = getJobApplications(job);
                const status = (job?.status || 'unknown').toLowerCase();
                const statusTone =
                  status === 'active'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200';

                return (
                  <article
                    key={job?._id || `${job?.jobTitle || 'job'}-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {job?.jobTitle || 'Untitled role'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {job?.company?.name || 'Company'}
                      </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 text-xs sm:text-right">
                      <div>
                        <p className="text-base font-bold text-slate-900 leading-tight">
                          {applications ?? '--'}
                        </p>
                        <p className="text-[11px] text-slate-400">Applications</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md border ${statusTone}`}>
                        {status}
                      </span>
                      <span className="text-slate-400">{timeAgo(job?.createdAt)}</span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
