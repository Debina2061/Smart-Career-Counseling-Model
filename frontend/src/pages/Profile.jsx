import React, { useState, useEffect, useRef, useCallback } from 'react'
import { FaFileAlt, FaBrain, FaUser, FaBell, FaCloudUploadAlt, FaPlusCircle, FaCode, FaGraduationCap, FaBriefcase, FaProjectDiagram, FaTools, FaChartBar, FaFilePdf, FaExpand, FaCompress, FaExternalLinkAlt, FaCheckCircle, FaShieldAlt, FaTrashAlt, FaExclamationCircle } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import PdfImagePreview from '../components/PdfImagePreview'
import StudentProfileDropdown from '../components/StudentProfileDropdown'
import { authAPI, resumeAPI, userAPI } from '../utils/api'

function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('personal')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const [userProfile, setUserProfile] = useState({
    name: 'User',
    email: '',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
  })

  const [profileData, setProfileData] = useState({
    age: '',
    gender: 'male',
    educationLevel: '',
    skills: [],
    interest: []
  })

  const [resume, setResume] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  const [newSkill, setNewSkill] = useState('')
  const [newInterest, setNewInterest] = useState('')

  // ── Email verification OTP state ──
  const OTP_LENGTH = 6
  const RESEND_COOLDOWN = 60
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const otpRefs = useRef([])
  const [verifyError, setVerifyError] = useState('')
  const [verifyStatus, setVerifyStatus] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  // ── Delete account state ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (resendTimer <= 0) return
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [resendTimer])

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus()
  }
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = [...otp]
    pasted.split('').forEach((ch, i) => { next[i] = ch })
    setOtp(next)
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const sendVerificationOtp = async () => {
    setVerifyError('')
    setVerifyStatus('')
    try {
      await authAPI.resendOtp(user.email, 'verify')
      setShowOtpInput(true)
      setResendTimer(RESEND_COOLDOWN)
      setVerifyStatus('Verification code sent to your email')
    } catch (err) {
      setVerifyError(err.message || 'Failed to send verification code')
    }
  }

  const handleVerifyOtp = useCallback(async () => {
    const code = otp.join('')
    if (code.length !== OTP_LENGTH) { setVerifyError('Enter the full 6-digit code'); return }
    setVerifyLoading(true)
    setVerifyError('')
    try {
      await authAPI.verifyOtp(user.email, code)
      try {
        const profile = await authAPI.getProfile()
        updateUser(profile.user || profile)
      } catch { /* ignore */ }
      setVerifyStatus('Email verified successfully!')
      setShowOtpInput(false)
    } catch (err) {
      setVerifyError(err.message || 'Invalid or expired OTP')
    } finally {
      setVerifyLoading(false)
    }
  }, [otp, user?.email, updateUser])

  useEffect(() => {
    if (otp.every((d) => d !== '')) handleVerifyOtp()
  }, [otp, handleVerifyOtp])

  const handleDeleteAccount = async () => {
    if (deleteTyped !== 'DELETE') return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await authAPI.deleteAccount()
      logout()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account')
      setDeleteLoading(false)
    }
  }

  // Build notifications from actual profile/resume status
  const notifications = (() => {
    const items = [];
    if (!resume) {
      items.push({
        id: 'resume',
        icon: FaFileAlt,
        title: 'Upload Your Resume',
        message: 'Get ATS insights and career recommendations',
        color: 'purple',
        action: 'Upload',
        tab: 'resume'
      });
    }
    if (!profileData.educationLevel) {
      items.push({
        id: 'education',
        icon: FaGraduationCap,
        title: 'Add Education Level',
        message: 'Improve career matching accuracy',
        color: 'blue',
        action: 'Add',
        tab: 'personal'
      });
    }
    if (!profileData.skills || profileData.skills.length === 0) {
      items.push({
        id: 'skills',
        icon: FaCode,
        title: 'Add Your Skills',
        message: 'Unlock relevant career path recommendations',
        color: 'green',
        action: 'Add',
        tab: 'skills'
      });
    }
    if (!profileData.interest || profileData.interest.length === 0) {
      items.push({
        id: 'interests',
        icon: FaTools,
        title: 'Add Your Interests',
        message: 'Get better personalized recommendations',
        color: 'orange',
        action: 'Add',
        tab: 'skills'
      });
    }
    if (!profileData.age) {
      items.push({
        id: 'age',
        icon: FaUser,
        title: 'Complete Your Profile',
        message: 'Add your age to finish profile setup',
        color: 'teal',
        action: 'Add',
        tab: 'personal'
      });
    }
    return items;
  })();

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.fullName || user.name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        avatar: user.avatarUrl || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'User'}`,
      });
      loadProfile();
      loadResume();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const loadProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const data = response?.data || null;
      if (data) {
        setProfileData({
          age: data.age || '',
          gender: data.gender || 'male',
          educationLevel: data.educationLevel || '',
          skills: Array.isArray(data.skills) ? data.skills : [],
          interest: Array.isArray(data.interest) ? data.interest : [],
        });
      }
    } catch (error) {
      console.log('Profile not found yet');
    }
  };

  const loadResume = async () => {
    try {
      const response = await resumeAPI.getResume();
      setResume(response?.data || null);
    } catch (error) {
      setResume(null);
    }
  };

  const pollForResumeAnalysis = async () => {
    const maxAttempts = 12;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await resumeAPI.getResume();
      const resumePayload = response?.data || response;
      if (resumePayload) setResume(resumePayload);

      const status = resumePayload?.analysisStatus || 'completed';
      if (status === 'completed') return true;
      if (status === 'failed') {
        setMessage({ type: 'error', text: resumePayload?.analysisError || 'Resume analysis failed' });
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    setMessage({ type: 'error', text: 'Resume analysis is taking longer than expected.' });
    return false;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfileData({ ...profileData, [name]: value })
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setMessage({ type: '', text: '' });
  };

  const handleResumeFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setMessage({ type: '', text: '' });
    } else {
      setMessage({ type: 'error', text: 'Please upload a PDF file' });
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setMessage({ type: 'error', text: 'Please select a resume file first' });
      return;
    }

    setUploadingResume(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await resumeAPI.uploadResume(resumeFile);
      const payload = response?.data || response;
      setResumeFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (payload?.status === 'processing' || payload?.analysisStatus === 'processing') {
        setMessage({ type: 'success', text: 'Resume uploaded. Analysis is in progress...' });
        await pollForResumeAnalysis();
      } else {
        setMessage({ type: 'success', text: 'Resume uploaded successfully!' });
        loadResume();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload resume' });
    } finally {
      setUploadingResume(false);
    }
  }

  const handleAddSkill = () => {
    const skillToAdd = newSkill.trim();
    if (!skillToAdd) return;
    setProfileData((prev) => {
      if (prev.skills.some((skill) => skill.toLowerCase() === skillToAdd.toLowerCase())) {
        return prev;
      }
      return { ...prev, skills: [...prev.skills, skillToAdd] };
    });
    setNewSkill('');
  }

  const handleAddInterest = () => {
    const interestToAdd = newInterest.trim();
    if (!interestToAdd) return;
    setProfileData((prev) => {
      if (prev.interest.some((interestItem) => interestItem.toLowerCase() === interestToAdd.toLowerCase())) {
        return prev;
      }
      return { ...prev, interest: [...prev.interest, interestToAdd] };
    });
    setNewInterest('');
  }

  const handleRemoveSkill = (skill) => {
    setProfileData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  const handleRemoveInterest = (interest) => {
    setProfileData((prev) => ({
      ...prev,
      interest: prev.interest.filter((i) => i !== interest),
    }))
  }

  const handleSaveChanges = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updatePayload = {
        age: profileData.age,
        gender: profileData.gender,
        educationLevel: profileData.educationLevel,
        skills: profileData.skills,
        interest: profileData.interest,
        imgName: avatarFile || undefined,
      };

      const response = await authAPI.updateProfile(updatePayload);
      if (response?.user) {
        updateUser(response.user);
      }
      if (response?.avatarUrl) {
        setUserProfile((prev) => ({ ...prev, avatar: response.avatarUrl }));
      }
      if (response?.data) {
        setProfileData((prev) => ({
          ...prev,
          age: response.data.age || '',
          gender: response.data.gender || 'male',
          educationLevel: response.data.educationLevel || '',
          skills: Array.isArray(response.data.skills) ? response.data.skills : [],
          interest: Array.isArray(response.data.interest) ? response.data.interest : [],
        }));
      }
      setAvatarFile(null);
      setAvatarPreview('');
      setMessage({ type: 'success', text: 'Changes saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save changes' });
    } finally {
      setLoading(false);
    }
  }

  const resumePdfUrl = resume?.resumeUrl
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/user/resume/pdf?token=${encodeURIComponent(localStorage.getItem('token') || '')}&t=${encodeURIComponent(resume?.updatedAt || '')}`
    : '';
  const completionChecks = [
    Boolean(userProfile.name && userProfile.email),
    Boolean(profileData.age && profileData.gender),
    Boolean(profileData.educationLevel),
    Boolean(resume),
  ];
  const completionPercent = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

  const profileTabs = [
    { key: 'personal', label: 'Personal Info' },
    { key: 'skills', label: 'Skills' },
    { key: 'resume', label: 'Resume' },
    { key: 'account', label: 'Account' },
  ];

  return (
    <div className="flex min-h-screen bg-[#f3f4f8]">
      <Sidebar />

      <div className="ml-52 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3" ref={notificationRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Notifications"
              >
                <FaBell className="text-lg" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <FaBell className="text-[#4f46e5]" />
                        Notifications
                      </h3>
                      {notifications.length > 0 && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                          {notifications.length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <FaCheckCircle className="mx-auto mb-2 text-3xl text-emerald-500" />
                        <p className="text-sm text-slate-600">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notifications.map((notif) => {
                          const Icon = notif.icon;
                          const colorMap = {
                            purple: 'text-purple-600 bg-purple-50',
                            blue: 'text-blue-600 bg-blue-50',
                            green: 'text-green-600 bg-green-50',
                            orange: 'text-orange-600 bg-orange-50',
                            teal: 'text-teal-600 bg-teal-50'
                          };
                          const colors = colorMap[notif.color] || colorMap.blue;

                          return (
                            <div
                              key={notif.id}
                              className="cursor-pointer px-4 py-3 transition hover:bg-slate-50"
                              onClick={() => {
                                setActiveTab(notif.tab);
                                setShowNotifications(false);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors}`}>
                                  <Icon className="text-sm" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="mb-0.5 text-sm font-medium text-slate-900">
                                    {notif.title}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {notif.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <StudentProfileDropdown
              name={userProfile.name}
              email={userProfile.email || 'student@demo.com'}
              avatar={avatarPreview || userProfile.avatar}
              className="border-l border-slate-200 pl-3"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f5f7fb] p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-4">
            <div>
              <h1 className="text-4xl font-bold leading-none text-slate-900">Profile Management</h1>
              <p className="mt-2 text-slate-600">Manage your personal information and preferences</p>
            </div>

          {message.text && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              {message.text}
            </div>
          )}

            {completionPercent < 100 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Profile Completion</h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#5b5ee7]">{completionPercent}%</span>
                  <FaExclamationCircle className="text-amber-500" />
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#dcdffa]">
                <div
                  className="h-full rounded-full bg-linear-to-r from-[#5b5ee7] to-[#7a6cf0]"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-600">Complete your profile to get better career recommendations</p>
            </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {profileTabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      activeTab === tab.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              {activeTab === 'personal' && (
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Personal Information</h3>

                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <img
                      src={avatarPreview || userProfile.avatar}
                      alt={userProfile.name}
                      className="h-20 w-20 rounded-full border border-slate-200 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.email || 'User'}`;
                      }}
                    />

                    <div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FaCloudUploadAlt className="text-slate-500" />
                        Upload Photo
                      </button>
                      <p className="mt-2 text-xs text-slate-500">JPG, PNG or GIF (MAX. 2MB)</p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Full Name</label>
                      <input
                        type="text"
                        value={userProfile.name}
                        disabled
                        className="w-full rounded-lg border border-slate-200 bg-[#f8fafc] px-4 py-2 text-slate-600"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                      <input
                        type="email"
                        value={userProfile.email}
                        disabled
                        className="w-full rounded-lg border border-slate-200 bg-[#f8fafc] px-4 py-2 text-slate-600"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Age</label>
                      <input
                        type="number"
                        name="age"
                        value={profileData.age}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-[#5b5ee7] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Gender</label>
                      <select
                        name="gender"
                        value={profileData.gender}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-[#5b5ee7] focus:outline-none"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Education Level</label>
                      <select
                        name="educationLevel"
                        value={profileData.educationLevel}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-[#5b5ee7] focus:outline-none"
                      >
                        <option value="">Select</option>
                        <option value="secondary">Secondary</option>
                        <option value="bachelor">Bachelor's Degree</option>
                        <option value="master">Master's Degree</option>
                        <option value="phd">PhD</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    disabled={loading}
                    className="mt-6 rounded-lg bg-[#6d5ef7] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#5a4ee0] disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}

              {activeTab === 'resume' && (
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-slate-900">Resume</h3>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleResumeFileChange}
                        className="hidden"
                      />
                      {!resumeFile ? (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <FaCloudUploadAlt />
                          {resume?.resumeUrl ? 'Replace Resume' : 'Upload Resume'}
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600">{resumeFile.name}</span>
                          <button
                            type="button"
                            onClick={handleResumeUpload}
                            disabled={uploadingResume}
                            className="rounded-lg bg-[#6d5ef7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5a4ee0] disabled:opacity-50"
                          >
                            {uploadingResume ? 'Uploading...' : 'Upload'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {resume?.resumeUrl ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="p-3">
                          <PdfImagePreview pdfUrl={resumePdfUrl} maxPages={0} showPageCounter={false} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-14 text-center transition hover:border-[#6d5ef7] hover:bg-[#f5f6ff]"
                    >
                      <FaCloudUploadAlt className="mx-auto mb-4 text-5xl text-slate-400" />
                      <h4 className="text-lg font-semibold text-slate-900 mb-2">No resume uploaded yet</h4>
                      <p className="text-slate-500">Click here or use the button above to upload your PDF resume</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'skills' && (
                <div>
                  <div className="mb-8 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-slate-900">Skills & Interests</h3>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-slate-900 mb-4">Skills</h4>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        placeholder="Enter a skill..."
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-black"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        disabled={!newSkill.trim()}
                        className="flex items-center gap-2 rounded-lg bg-[#6d5ef7] px-6 py-2 font-semibold text-white transition hover:bg-[#5a4ee0] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FaPlusCircle className="text-lg" />
                        <span>Add</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {profileData.skills.map((skill, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-full bg-[#e7e8ff] px-4 py-2 font-medium text-[#4a43c7]">
                          <span>{skill}</span>
                          <button type="button" onClick={() => handleRemoveSkill(skill)} className="text-[#5a4ee0] hover:text-[#4338ca]" aria-label={`Remove ${skill}`}>x</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-900 mb-4">Interests</h4>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddInterest();
                          }
                        }}
                        placeholder="Enter an interest..."
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-black"
                      />
                      <button
                        type="button"
                        onClick={handleAddInterest}
                        disabled={!newInterest.trim()}
                        className="flex items-center gap-2 rounded-lg bg-[#6d5ef7] px-6 py-2 font-semibold text-white transition hover:bg-[#5a4ee0] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FaPlusCircle className="text-lg" />
                        <span>Add</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {profileData.interest.map((interest, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-full bg-[#fef3c7] px-4 py-2 font-medium text-amber-800">
                          <span>{interest}</span>
                          <button type="button" onClick={() => handleRemoveInterest(interest)} className="text-amber-700 hover:text-amber-900" aria-label={`Remove ${interest}`}>x</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={loading}
                      className="rounded-lg bg-[#6d5ef7] px-8 py-3 font-semibold text-white transition hover:bg-[#5a4ee0] disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <h3 className="text-2xl font-bold text-slate-900 mb-6">Email Verification</h3>

                    {user?.isVerified ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <FaCheckCircle className="text-emerald-600 text-lg" />
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-800">Email Verified</p>
                          <p className="text-sm text-emerald-600">{user.email} is verified</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-amber-800">Email Not Verified</p>
                            <p className="text-sm text-amber-600">{user?.email} needs verification</p>
                          </div>
                          {!showOtpInput && (
                            <button
                              type="button"
                              onClick={sendVerificationOtp}
                              className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                            >
                              Send Code
                            </button>
                          )}
                        </div>

                        {verifyError && <div className="text-sm text-red-600 mb-3">{verifyError}</div>}
                        {verifyStatus && !showOtpInput && <div className="text-sm text-emerald-700 mb-3">{verifyStatus}</div>}

                        {showOtpInput && (
                          <div className="border border-slate-200 rounded-xl p-5">
                            {verifyStatus && <p className="text-sm text-emerald-700 mb-3">{verifyStatus}</p>}
                            <p className="text-sm text-slate-700 mb-3 font-medium">Enter the 6-digit code sent to your email</p>
                            <div className="flex items-center gap-3 flex-wrap" onPaste={handleOtpPaste}>
                              {otp.map((digit, i) => (
                                <input
                                  key={i}
                                  ref={(el) => (otpRefs.current[i] = el)}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleOtpChange(i, e.target.value)}
                                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                  className="h-12 w-10 rounded-lg border-2 border-slate-200 bg-white text-center text-xl font-bold text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                                />
                              ))}
                              <button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={verifyLoading || otp.join('').length !== OTP_LENGTH}
                                className="ml-2 rounded-lg bg-[#6d5ef7] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a4ee0] disabled:opacity-50"
                              >
                                {verifyLoading ? 'Verifying...' : 'Verify'}
                              </button>
                            </div>
                            <div className="mt-3 text-sm text-slate-500">
                              {resendTimer > 0 ? (
                                <span>Resend code in <span className="font-semibold text-teal-600">{resendTimer}s</span></span>
                              ) : (
                                <button type="button" onClick={sendVerificationOtp} className="font-semibold text-teal-600 hover:underline">
                                  Resend Code
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="rounded-xl border border-red-200 bg-white p-6">
                    <h3 className="text-2xl font-bold text-red-700 mb-2">Danger Zone</h3>
                    <p className="text-slate-500 text-sm mb-6">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>

                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-5 py-2.5 border-2 border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition"
                      >
                        <FaTrashAlt />
                        Delete My Account
                      </button>
                    ) : (
                      <div className="border border-red-200 rounded-xl p-5 bg-red-50">
                        <p className="text-sm text-red-800 font-semibold mb-1">Are you absolutely sure?</p>
                        <p className="text-sm text-red-600 mb-4">
                          This will permanently delete your profile, resume, recommendations, chat history, and all scan data.
                          Type <span className="font-bold">DELETE</span> to confirm.
                        </p>
                        {deleteError && <div className="text-sm text-red-600 mb-3">{deleteError}</div>}
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={deleteTyped}
                            onChange={(e) => setDeleteTyped(e.target.value)}
                            placeholder='Type "DELETE"'
                            className="flex-1 max-w-xs px-4 py-2 border border-red-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                          />
                          <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={deleteTyped !== 'DELETE' || deleteLoading}
                            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
                          >
                            {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowDeleteConfirm(false); setDeleteTyped(''); setDeleteError(''); }}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Profile
