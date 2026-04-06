import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import PdfImagePreview from '../../components/PdfImagePreview';
import { adminAPI } from '../../utils/api';
import { useAdminNotification } from '../../context/AdminNotificationContext';

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

function StudentDetail() {
  const { userId } = useParams();
  const [detail, setDetail] = useState(null);
  const { notify } = useAdminNotification();
  const resumePdfUrl = buildAdminResumePdfUrl(userId, detail?.resume?.resumePdfUrl);

  const loadDetail = async () => {
    try {
      const response = await adminAPI.getUserDetails(userId);
      const payload = response?.data || response;
      setDetail(payload?.data || payload);
    } catch (err) {
      notify(err.message || 'Failed to load user details', 'error');
    }
  };

  useEffect(() => {
    loadDetail();
  }, [userId]);

  const toggleVerification = async () => {
    if (!detail?.user?._id) return;
    try {
      const updated = await adminAPI.updateUser(detail.user._id, {
        isVerified: !detail.user.isVerified,
      });
      setDetail((prev) => ({ ...prev, user: updated?.data || updated }));
      notify('Verification status updated.', 'success');
    } catch (err) {
      notify(err.message || 'Failed to update user', 'error');
    }
  };

  return (
    <AdminLayout title="Student Details" eyebrow="Student Management">
      <div className="mb-6">
        <Link to="/admin/students" className="text-sm text-teal-600 font-semibold">
          ← Back to students
        </Link>
      </div>

      {!detail ? (
        <div className="text-sm text-slate-500">Loading student...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/90 rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Student Profile</h3>
            <p className="text-sm text-slate-500">Name</p>
            <p className="text-lg font-semibold text-slate-900">{detail.user?.name}</p>
            <p className="text-sm text-slate-500 mt-3">Email</p>
            <p className="text-sm text-slate-700">{detail.user?.email}</p>
            <p className="text-sm text-slate-500 mt-3">Role</p>
            <p className="text-sm text-slate-700 capitalize">{detail.user?.Role}</p>
            <div className="mt-4">
              <span className={`text-xs px-2 py-1 rounded-full ${detail.user?.isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {detail.user?.isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <button
              onClick={toggleVerification}
              className="mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold"
            >
              Toggle Verification
            </button>
          </div>

          <div className="bg-white/90 rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Resume Status</h3>
            {detail.resume ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>ATS Score</span>
                  <span className="font-semibold text-slate-900">{detail.resume.atsScore ?? '--'}%</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Analysis Status</span>
                  <span className="font-semibold text-slate-900 capitalize">{detail.resume.analysisStatus}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Last Updated</span>
                  <span className="font-semibold text-slate-900">
                    {detail.resume.updatedAt ? new Date(detail.resume.updatedAt).toLocaleDateString() : '--'}
                  </span>
                </div>
                {resumePdfUrl && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Resume Preview (Image)</p>
                    <PdfImagePreview pdfUrl={resumePdfUrl} maxPages={2} />
                    <a
                      href={resumePdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600"
                    >
                      Open Full Resume
                    </a>
                  </div>
                )}
                {(detail.resume.suggestions || []).length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Suggestions</p>
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                      {detail.resume.suggestions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No resume uploaded.</p>
            )}
          </div>

          <div className="bg-white/90 rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Career Recommendations</h3>
            {(detail.topRecommendations || []).length === 0 ? (
              <p className="text-sm text-slate-500">No recommendations found.</p>
            ) : (
              <div className="space-y-3">
                {detail.topRecommendations.map((rec, index) => (
                  <div key={`${rec.careerName}-${index}`} className="border border-slate-200 rounded-xl px-4 py-3">
                    <p className="font-semibold text-slate-900">{rec.careerName}</p>
                    <p className="text-xs text-slate-500">Match {rec.matchScore || 0}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default StudentDetail;
