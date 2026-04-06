import { useEffect, useState } from 'react';
import {
  FaCheckCircle,
  FaChevronDown,
  FaEye,
  FaSearch,
  FaTimes,
  FaUserGraduate,
  FaUsers,
} from 'react-icons/fa';
import AdminLayout from '../../components/AdminLayout';
import PdfImagePreview from '../../components/PdfImagePreview';
import { adminAPI } from '../../utils/api';
import { useAdminNotification } from '../../context/AdminNotificationContext';

function getInitials(name) {
  return (name || 'NA')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

function formatDate(value) {
  if (!value) return '--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function roleLabel(role) {
  if (!role) return 'Student';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function buildAdminResumePdfUrl(userId, resumePdfPath) {
  if (!userId) return null;

  const token = localStorage.getItem('token');
  const apiBase =
    (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : ''))
      .replace(/\/$/, '');
  const endpoint = resumePdfPath || `/admin/users/${userId}/resume/pdf`;
  const separator = endpoint.includes('?') ? '&' : '?';
  const query = token ? `${separator}token=${encodeURIComponent(token)}` : '';

  return `${apiBase}${endpoint}${query}`;
}

function StudentManagement() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: '', verified: '' });
  const [loading, setLoading] = useState(false);
  const [detailModal, setDetailModal] = useState({
    open: false,
    loading: false,
    detail: null,
    user: null,
  });
  const { notify } = useAdminNotification();

  const loadUsers = async (activeFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        search: activeFilters.search || undefined,
        role: activeFilters.role || undefined,
        verified: activeFilters.verified || undefined,
      };
      const response = await adminAPI.getAllUsers(params);
      const payload = response?.data || response;
      setUsers(payload?.users || []);
    } catch (err) {
      notify(err.message || 'Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(filters);
    }, 250);

    return () => clearTimeout(timer);
  }, [filters.search, filters.role, filters.verified]);

  useEffect(() => {
    if (!detailModal.open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDetailModal((prev) => ({
          ...prev,
          open: false,
          loading: false,
          detail: null,
          user: null,
        }));
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [detailModal.open]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenDetail = async (user) => {
    setDetailModal({
      open: true,
      loading: true,
      detail: null,
      user,
    });

    try {
      const response = await adminAPI.getUserDetails(user._id);
      const payload = response?.data || response;

      setDetailModal((prev) => ({
        ...prev,
        loading: false,
        detail: payload?.data || payload,
      }));
    } catch (err) {
      notify(err.message || 'Failed to load student details', 'error');
      setDetailModal((prev) => ({ ...prev, loading: false, detail: null }));
    }
  };

  const handleCloseDetail = () => {
    setDetailModal({
      open: false,
      loading: false,
      detail: null,
      user: null,
    });
  };

  const totalUsers = users.length;
  const verifiedCount = users.filter((u) => u.isVerified).length;
  const unverifiedCount = totalUsers - verifiedCount;

  const detailUser = detailModal.detail?.user || detailModal.user;
  const detailResume = detailModal.detail?.resume || null;
  const detailResumePdfUrl = buildAdminResumePdfUrl(detailUser?._id, detailResume?.resumePdfUrl);
  const recommendations = detailModal.detail?.topRecommendations || [];
  const topMatch = recommendations.reduce((best, current) => {
    if (!best) return current;
    return (current.matchScore || 0) > (best.matchScore || 0) ? current : best;
  }, null);

  return (
    <AdminLayout
      title="Student Management"
      subtitle="View and manage student accounts"
      eyebrow="Directory"
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              label: 'Total Users',
              value: totalUsers.toLocaleString(),
              icon: FaUsers,
              iconTone: 'bg-indigo-50 text-indigo-500',
            },
            {
              label: 'Verified',
              value: verifiedCount.toLocaleString(),
              icon: FaCheckCircle,
              iconTone: 'bg-emerald-50 text-emerald-500',
            },
            {
              label: 'Unverified',
              value: unverifiedCount.toLocaleString(),
              icon: FaUserGraduate,
              iconTone: 'bg-amber-50 text-amber-500',
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.label}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
              >
                <div className={`w-11 h-11 rounded-xl ${card.iconTone} flex items-center justify-center`}>
                  <Icon className="text-lg" />
                </div>
                <p className="text-sm text-slate-500 mt-4">{card.label}</p>
                <p className="text-[2rem] font-bold leading-tight text-slate-900 mt-1">
                  {card.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.42fr_0.42fr] gap-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search students..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:border-indigo-300"
              />
            </div>

            <div className="relative">
              <select
                name="role"
                value={filters.role}
                onChange={handleFilterChange}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-sm text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="admin">Admin</option>
              </select>
              <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            </div>

            <div className="relative">
              <select
                name="verified"
                value={filters.verified}
                onChange={handleFilterChange}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-sm text-slate-700 focus:outline-none focus:border-indigo-300"
              >
                <option value="">All Status</option>
                <option value="true">Verified</option>
                <option value="false">Pending</option>
              </select>
              <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900">Students</h3>
            {loading && <span className="text-sm text-slate-500">Loading...</span>}
          </div>

          {users.length === 0 ? (
            <p className="text-sm text-slate-500">No users found.</p>
          ) : (
            <div className="space-y-2.5">
              {users.map((user) => (
                <article
                  key={user._id}
                  className="rounded-xl border border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-11 w-11 rounded-full bg-indigo-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {getInitials(user.name)}
                    </span>

                    <div className="min-w-0">
                      <p className="text-[1.35rem] leading-tight font-bold text-slate-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 font-semibold">
                      {roleLabel(user.Role)}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                        user.isVerified
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                          : 'border-amber-200 bg-amber-50 text-amber-600'
                      }`}
                    >
                      <FaCheckCircle className="text-[10px]" />
                      {user.isVerified ? 'Verified' : 'Pending'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenDetail(user)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <FaEye className="text-xs" />
                      View
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {detailModal.open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/35 p-4 flex items-start sm:items-center justify-center"
          onClick={handleCloseDetail}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Student Details</h3>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <FaTimes className="mx-auto" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {detailModal.loading ? (
                <p className="text-sm text-slate-500">Loading student details...</p>
              ) : (
                <>
                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-2xl font-bold text-slate-900">Profile Information</h4>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Name</p>
                        <p className="font-semibold text-slate-900 mt-1">
                          {detailUser?.name || 'Student'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="font-semibold text-slate-900 mt-1">
                          {detailUser?.email || '--'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Role</p>
                        <span className="inline-flex mt-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {roleLabel(detailUser?.Role)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Verification</p>
                        <span
                          className={`inline-flex mt-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                            detailUser?.isVerified
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              : 'border-amber-200 bg-amber-50 text-amber-600'
                          }`}
                        >
                          {detailUser?.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-2xl font-bold text-slate-900">Resume Status</h4>
                    {detailResume ? (
                      <>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-slate-500">ATS Score</p>
                            <p className="text-[2rem] font-bold leading-none text-indigo-500 mt-1">
                              {detailResume.atsScore ?? '--'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">Status</p>
                            <span className="inline-flex mt-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 capitalize">
                              {detailResume.analysisStatus || 'Unknown'}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">Last Updated</p>
                            <p className="font-semibold text-slate-900 mt-1">
                              {formatDate(detailResume.updatedAt)}
                            </p>
                          </div>
                        </div>

                        {detailResume && detailResumePdfUrl && (
                          <div className="mt-4 space-y-3">
                            <p className="text-sm font-semibold text-slate-700">Resume Preview (Image)</p>
                            <PdfImagePreview pdfUrl={detailResumePdfUrl} maxPages={2} />
                            <a
                              href={detailResumePdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition"
                            >
                              Open Full Resume
                            </a>
                          </div>
                        )}

                        {(detailResume.suggestions || []).length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-slate-700">Suggestions</p>
                            <ul className="mt-2 list-disc list-inside text-sm text-slate-600 space-y-1">
                              {detailResume.suggestions.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 mt-3">No resume uploaded yet.</p>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-2xl font-bold text-slate-900">Career Recommendations</h4>

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-slate-500">Total Matches</p>
                      <p className="text-4xl font-bold leading-none text-slate-900">
                        {recommendations.length}
                      </p>
                    </div>

                    {topMatch && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-500">Top Match</p>
                          <p className="font-semibold text-slate-900 mt-1">{topMatch.careerName}</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-500">
                          {Math.round(topMatch.matchScore || 0)}%
                        </p>
                      </div>
                    )}

                    {recommendations.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {recommendations.map((rec, index) => (
                          <div
                            key={`${rec.careerName || 'career'}-${index}`}
                            className="rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between"
                          >
                            <p className="text-sm font-medium text-slate-700 truncate">
                              {rec.careerName || 'Career'}
                            </p>
                            <p className="text-sm font-semibold text-emerald-500">
                              {Math.round(rec.matchScore || 0)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default StudentManagement;
