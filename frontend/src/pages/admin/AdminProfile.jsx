import { useEffect, useState } from 'react';
import { FaCamera, FaUser, FaEnvelope, FaShieldAlt, FaCheckCircle, FaCrown } from 'react-icons/fa';
import AdminLayout from '../../components/AdminLayout';
import { adminAPI, authAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useAdminNotification } from '../../context/AdminNotificationContext';

function AdminProfile() {
  const { user, updateUser } = useAuth();
  const { notify } = useAdminNotification();
  const [adminInfo, setAdminInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const response = await adminAPI.getAdminMe();
        const payload = response?.data || response;
        setAdminInfo(payload?.data || payload);
      } catch (err) {
        notify(err.message || 'Failed to load admin info', 'error');
      }
    };
    loadAdmin();
  }, []);

  useEffect(() => {
    if (user?.name) {
      setFormData((prev) => ({ ...prev, name: user.name }));
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Please upload an image file', 'error');
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        imgName: avatarFile || undefined,
      };
      const response = await authAPI.updateProfile(payload);
      if (response?.avatarUrl) {
        updateUser({ avatarUrl: response.avatarUrl, name: formData.name });
      } else {
        updateUser({ name: formData.name });
      }
      notify('Profile updated successfully.', 'success');
      setAvatarFile(null);
      setAvatarPreview('');
    } catch (err) {
      notify(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl =
    avatarPreview ||
    user?.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Admin'}`;

  return (
    <AdminLayout title="Profile & Settings" eyebrow="Admin Account">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Admin Identity Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
          <div className="h-24 bg-linear-to-r from-teal-500 via-emerald-500 to-teal-600" />
          <div className="px-6 pb-6 -mt-12">
            <div className="relative w-24 h-24 mx-auto mb-4 group">
              <img
                src={avatarUrl}
                alt="Admin avatar"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <FaCamera className="text-white text-lg" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                {user?.name || 'Admin'}
              </h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter display name"
                  className="w-full mt-1.5 px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-linear-to-r from-teal-600 to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Admin Details Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30">
            <h3 className="text-lg font-bold text-slate-900">
              Admin Details
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Account information and permissions
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <FaEnvelope className="text-blue-500 text-sm" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Email
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <FaUser className="text-violet-500 text-sm" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Role
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 capitalize">
                    {user?.Role || 'admin'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <FaCrown className="text-amber-500 text-sm" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Admin Level
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5 capitalize">
                    {adminInfo?.admin?.adminLevel || 'admin'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <FaCheckCircle className="text-emerald-500 text-sm" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">
                    Active
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <FaShieldAlt className="text-slate-400 text-sm" />
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Permissions
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  adminInfo?.admin?.permissions || {}
                ).map(([key, value]) => (
                  <span
                    key={key}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                      value
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminProfile;
