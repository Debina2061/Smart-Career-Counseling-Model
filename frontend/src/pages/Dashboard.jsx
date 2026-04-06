import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaArrowRight,
  FaBell,
  FaBriefcase,
  FaBullseye,
  FaChartLine,
  FaCheckCircle,
  FaComments,
  FaFileAlt,
  FaMapPin,
  FaRobot,
  FaStar,
  FaUserCheck,
} from 'react-icons/fa'
import { Link } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import StudentProfileDropdown from '../components/StudentProfileDropdown'
import { useAuth } from '../context/AuthContext'
import { authAPI, userAPI } from '../utils/api'

const formatDate = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const daysSince = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diff = Date.now() - date.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

const formatRelativeDay = (value) => {
  const days = daysSince(value)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return formatDate(value)
}

const statusTone = (status) => {
  const value = (status || '').toLowerCase()

  if (value.includes('interview')) return 'border-emerald-200 bg-emerald-100 text-emerald-700'
  if (value.includes('shortlist') || value.includes('review')) return 'border-blue-200 bg-blue-100 text-blue-700'
  if (value.includes('reject')) return 'border-rose-200 bg-rose-100 text-rose-700'
  if (value.includes('applied') || value.includes('pending')) return 'border-amber-200 bg-amber-100 text-amber-700'

  return 'border-slate-200 bg-slate-100 text-slate-700'
}

const growthTone = (growth) => {
  const value = (growth || '').toLowerCase()

  if (value.includes('high')) {
    return {
      label: growth || 'High Demand',
      tone: 'border-slate-200 bg-slate-100 text-slate-700',
    }
  }

  if (value.includes('grow')) {
    return {
      label: growth || 'Growing',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }
  }

  return {
    label: growth || 'Stable',
    tone: 'border-slate-200 bg-slate-50 text-slate-600',
  }
}

function Dashboard() {
  const { user, updateUser } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)

  // Email verification state
  const OTP_LENGTH = 6
  const RESEND_COOLDOWN = 60
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const otpRefs = useRef([])
  const [verifyError, setVerifyError] = useState('')
  const [verifyStatus, setVerifyStatus] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

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
    pasted.split('').forEach((ch, i) => {
      next[i] = ch
    })

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
    if (code.length !== OTP_LENGTH) {
      setVerifyError('Enter the full 6-digit code')
      return
    }

    setVerifyLoading(true)
    setVerifyError('')

    try {
      await authAPI.verifyOtp(user.email, code)
      try {
        const profile = await authAPI.getProfile()
        updateUser(profile.user || profile)
      } catch {
        // Ignore profile refresh failures after successful OTP verify.
      }
      setVerifyStatus('Email verified successfully!')
      setShowOtpInput(false)
    } catch (err) {
      setVerifyError(err.message || 'Invalid or expired OTP')
    } finally {
      setVerifyLoading(false)
    }
  }, [otp, user?.email, updateUser])

  useEffect(() => {
    if (otp.every((digit) => digit !== '')) handleVerifyOtp()
  }, [otp, handleVerifyOtp])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (user) loadDashboard()
  }, [user])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const response = await userAPI.getDashboard()
      setDashboard(response?.data || null)
      setError('')
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const profile = dashboard?.profile
  const resume = dashboard?.resume
  const recommendations = dashboard?.recommendations
  const applications = dashboard?.applications
  const chat = dashboard?.chat

  const displayName =
    profile?.name || user?.fullName || user?.name || user?.email?.split('@')[0] || 'Student'

  const avatarUrl =
    profile?.avatarUrl ||
    user?.avatarUrl ||
    user?.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Student'}`

  const completionPercent = profile?.completionPercent ?? 0
  const atsScore = resume?.atsScore ?? null
  const isResumeProcessing = resume?.analysisStatus === 'processing'
  const resumeAgeDays = daysSince(resume?.updatedAt)

  const reminders = useMemo(() => {
    const items = []

    if ((completionPercent || 0) < 80) {
      items.push({
        id: 'profile',
        title: 'Complete Your Profile',
        description: 'Add your skills and interests to get better recommendations',
        cta: 'Complete Now',
        link: '/profile',
        icon: FaUserCheck,
        tone: 'border-amber-200 bg-amber-50',
        iconTone: 'bg-amber-100 text-amber-600',
        buttonTone: 'border border-amber-300 bg-white text-amber-700 hover:bg-amber-100',
      })
    }

    if (!resume?.hasResume || (resumeAgeDays !== null && resumeAgeDays >= 14)) {
      items.push({
        id: 'resume',
        title: 'Update Your Resume',
        description:
          resume?.hasResume && resumeAgeDays !== null
            ? `Your resume was last updated ${resumeAgeDays} day${resumeAgeDays === 1 ? '' : 's'} ago`
            : 'Upload your resume to unlock ATS scoring and recommendations',
        cta: resume?.hasResume ? 'Update Resume' : 'Upload Resume',
        link: '/profile',
        icon: FaFileAlt,
        tone: 'border-blue-200 bg-blue-50',
        iconTone: 'bg-blue-100 text-blue-600',
        buttonTone: 'border border-blue-300 bg-white text-blue-700 hover:bg-blue-100',
      })
    }

    return items
  }, [completionPercent, resume?.hasResume, resumeAgeDays])

  const notifications = useMemo(() => {
    const items = reminders.map((item) => item.title)
    if (user && user.isVerified === false) {
      items.unshift('Verify your email to unlock full account features')
    }
    return items
  }, [reminders, user])

  const stats = [
    {
      label: 'Profile Completion',
      value: `${completionPercent}%`,
      subValue: 'Keep improving',
      icon: FaCheckCircle,
      iconTone: 'bg-emerald-100 text-emerald-600',
      progress: completionPercent,
    },
    {
      label: 'ATS Resume Score',
      value: atsScore !== null ? `${atsScore}/100` : '--',
      subValue: isResumeProcessing ? 'Analyzing...' : 'Optimized',
      icon: FaFileAlt,
      iconTone: 'bg-indigo-100 text-indigo-600',
      progress: atsScore,
    },
    {
      label: 'Applications',
      value: `${applications?.count ?? 0}`,
      subValue: 'In progress',
      icon: FaBullseye,
      iconTone: 'bg-amber-100 text-amber-600',
      progress: null,
    },
    {
      label: 'Career Matches',
      value: `${recommendations?.count ?? 0}`,
      subValue: 'Found for you',
      icon: FaChartLine,
      iconTone: 'bg-violet-100 text-violet-600',
      progress: null,
    },
  ]

  const quickActions = [
    {
      title: 'Scan Resume',
      description: 'Get instant ATS score and improvements',
      cta: 'Get Started',
      link: '/ats-scanner',
      icon: FaFileAlt,
      iconTone: 'bg-[#4f46e5] text-white',
    },
    {
      title: 'Career Matches',
      description: 'View personalized recommendations',
      cta: 'Get Started',
      link: '/career-recommendation',
      icon: FaMapPin,
      iconTone: 'bg-[#059669] text-white',
    },
    {
      title: 'AI Coach',
      description: 'Get career guidance 24/7',
      cta: 'Get Started',
      link: '/ai-chatbot',
      icon: FaRobot,
      iconTone: 'bg-[#2563eb] text-white',
    },
  ]

  const topCareers = (recommendations?.topCareers || []).slice(0, 4)
  const recentApplications = (applications?.recent || []).slice(0, 4)
  const recentChats = (chat?.sessions || []).slice(0, 3)

  return (
    <div className="flex min-h-screen bg-[#f3f4f8]">
      <Sidebar />

      <div className="ml-52 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3" ref={notificationRef}>
            <div className="relative">
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Notifications"
              >
                <FaBell className="text-lg" />
              </button>
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {notifications.length}
                </span>
              )}

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-slate-500">You are all caught up.</div>
                  ) : (
                    <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                      {notifications.map((item, index) => (
                        <div key={`${item}-${index}`} className="px-4 py-3 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <StudentProfileDropdown
              name={displayName}
              email={profile?.email || user?.email || 'student@demo.com'}
              avatar={avatarUrl}
              className="border-l border-slate-200 pl-3"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f5f7fb] p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-5">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Welcome back, {displayName}! <span aria-hidden="true">👋</span></h1>
              <p className="mt-1 text-slate-600">Here's your career progress overview</p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {user && user.isVerified === false && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-amber-900">Verify your email address</p>
                    <p className="text-sm text-amber-700">Please verify {user.email} to unlock the full experience.</p>
                  </div>

                  {!showOtpInput && (
                    <button
                      onClick={sendVerificationOtp}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                    >
                      Verify Now
                    </button>
                  )}
                </div>

                {verifyError && <p className="mt-3 text-sm text-rose-600">{verifyError}</p>}
                {verifyStatus && !showOtpInput && <p className="mt-3 text-sm text-emerald-700">{verifyStatus}</p>}

                {showOtpInput && (
                  <div className="mt-4 border-t border-amber-200 pt-4">
                    <p className="text-sm font-medium text-amber-800">Enter the 6-digit code sent to your email</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2" onPaste={handleOtpPaste}>
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            otpRefs.current[index] = el
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="h-11 w-10 rounded-lg border-2 border-amber-300 bg-white text-center text-lg font-bold text-slate-900 outline-none transition focus:border-amber-500"
                        />
                      ))}

                      <button
                        onClick={handleVerifyOtp}
                        disabled={verifyLoading || otp.join('').length !== OTP_LENGTH}
                        className="ml-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {verifyLoading ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>

                    <div className="mt-3 text-sm text-amber-700">
                      {resendTimer > 0 ? (
                        <span>Resend code in <span className="font-semibold">{resendTimer}s</span></span>
                      ) : (
                        <button onClick={sendVerificationOtp} className="font-semibold hover:underline">
                          Resend Code
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon

                return (
                  <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconTone}`}>
                      <Icon className="text-lg" />
                    </div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="mt-1 text-4xl font-bold leading-none text-slate-900">{stat.value}</p>
                    <p className="mt-2 text-sm text-slate-500">{stat.subValue}</p>

                    {stat.progress !== null && (
                      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200">
                        <div
                          className="h-1.5 rounded-full bg-[#4f46e5]"
                          style={{
                            width: `${Math.min(100, Math.max(0, stat.progress || 0))}%`,
                          }}
                        />
                      </div>
                    )}
                  </article>
                )
              })}
            </div>

            {reminders.length > 0 && (
              <div className="space-y-3">
                {reminders.map((item) => {
                  const Icon = item.icon

                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${item.tone}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${item.iconTone}`}>
                          <Icon className="text-sm" />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-800">{item.title}</p>
                          <p className="text-sm text-slate-600">{item.description}</p>
                        </div>
                      </div>

                      <Link
                        to={item.link}
                        className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${item.buttonTone}`}
                      >
                        {item.cta}
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}

            <section>
              <h2 className="text-2xl font-bold text-slate-900">Quick Actions</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                {quickActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <Link
                      key={action.title}
                      to={action.link}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow"
                    >
                      <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg ${action.iconTone}`}>
                        <Icon />
                      </span>
                      <p className="mt-4 text-2xl font-bold text-slate-900">{action.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{action.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#4f46e5]">
                        {action.cta}
                        <FaArrowRight className="text-xs" />
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Top Career Matches</h3>
                  <Link to="/career-recommendation" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
                    View All
                    <FaArrowRight className="text-xs" />
                  </Link>
                </div>

                {topCareers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                    No recommendations yet. Generate your first career matches.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topCareers.map((career, index) => {
                      const trend = growthTone(career.growthPotential)

                      return (
                        <div key={`${career.careerName}-${index}`} className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{career.careerName}</p>
                            <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${trend.tone}`}>
                              {trend.label}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold leading-none text-emerald-600">{career.matchScore || 0}%</p>
                            <p className="mt-1 text-xs text-slate-500">Match</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Recent Applications</h3>
                  <Link to="/career-recommendation" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
                    View All
                    <FaArrowRight className="text-xs" />
                  </Link>
                </div>

                {recentApplications.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                    No applications yet. Apply to jobs and track them here.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentApplications.map((app, index) => (
                      <div key={`${app.jobTitle}-${index}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{app.jobTitle}</p>
                            <p className="text-sm text-slate-500">{app.company}</p>
                            <p className="mt-1 text-xs text-slate-400">{formatDate(app.appliedAt)}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone(app.status)}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                            {app.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Recent AI Chat Sessions</h3>
                <Link to="/ai-chatbot" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
                  View All
                  <FaArrowRight className="text-xs" />
                </Link>
              </div>

              {recentChats.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  No sessions yet. Start a chat to receive personalized guidance.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {recentChats.map((chatItem) => (
                    <article key={chatItem.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                          <FaComments className="text-xs" />
                        </span>
                        <span className="text-xs text-slate-400">{formatRelativeDay(chatItem.updatedAt)}</span>
                      </div>
                      <p className="mt-3 font-semibold text-slate-900">{chatItem.title || 'Career Session'}</p>
                      <p className="mt-2 min-h-9 text-sm text-slate-600">
                        {chatItem.lastMessage || 'Start a new conversation with AI coach.'}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">{chatItem.messageCount || 0} messages</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {loading && (
              <p className="text-xs text-slate-500">Refreshing dashboard data...</p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
