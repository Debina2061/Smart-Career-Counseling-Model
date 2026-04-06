import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaBell,
  FaDownload,
  FaEnvelope,
  FaEye,
  FaGithub,
  FaLinkedin,
  FaMapMarkerAlt,
  FaPhone,
  FaPlus,
  FaRegFileAlt,
  FaSave,
  FaTimes,
  FaTrashAlt,
} from 'react-icons/fa'
import Sidebar from '../components/Sidebar'
import StudentProfileDropdown from '../components/StudentProfileDropdown'
import { useAuth } from '../context/AuthContext'

const templateOptions = [
  {
    id: 'modern',
    title: 'Modern',
    subtitle: 'ATS-friendly two-column layout',
    accent: 'bg-indigo-500',
  },
  {
    id: 'classic',
    title: 'Classic',
    subtitle: 'Traditional single-column format',
    accent: 'bg-slate-500',
  },
  {
    id: 'creative',
    title: 'Creative',
    subtitle: 'Elegant sidebar format',
    accent: 'bg-slate-700',
  },
]

function TemplateMiniPreview({ templateId }) {
  if (templateId === 'classic') {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-2">
        <div className="mx-auto h-1.5 w-20 rounded-full bg-slate-500" />
        <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-slate-300" />
        <div className="mt-3 h-px w-full bg-slate-300" />
        <div className="mt-2 h-2 w-3/4 rounded bg-slate-200" />
        <div className="mt-1 h-2 w-2/3 rounded bg-slate-200" />
      </div>
    )
  }

  if (templateId === 'creative') {
    return (
      <div className="grid h-20 grid-cols-[35%_65%] overflow-hidden rounded-md border border-slate-200">
        <div className="bg-linear-to-b from-slate-700 to-slate-900 p-1.5">
          <div className="h-1.5 w-4/5 rounded bg-white/70" />
          <div className="mt-1 h-1.5 w-3/4 rounded bg-white/50" />
          <div className="mt-4 h-1.5 w-full rounded bg-white/30" />
          <div className="mt-1 h-1.5 w-4/5 rounded bg-white/30" />
        </div>
        <div className="bg-white p-1.5">
          <div className="h-1.5 w-3/4 rounded bg-slate-300" />
          <div className="mt-2 h-7 rounded bg-slate-100" />
          <div className="mt-1 h-1.5 w-2/3 rounded bg-slate-200" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div className="flex items-center justify-between">
        <div className="h-1.5 w-16 rounded-full bg-indigo-500" />
        <div className="h-1.5 w-10 rounded-full bg-indigo-200" />
      </div>
      <div className="mt-2 grid grid-cols-[66%_34%] gap-1.5">
        <div className="h-10 rounded bg-slate-100" />
        <div className="h-10 rounded bg-indigo-50" />
      </div>
      <div className="mt-1.5 h-1.5 w-3/4 rounded bg-slate-200" />
    </div>
  )
}

const formatMonth = (value) => {
  if (!value) return ''
  const date = new Date(`${value}-01`)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })
}

const hasExperienceContent = (item) =>
  Boolean(
    item?.jobTitle?.trim() ||
      item?.company?.trim() ||
      item?.achievements?.some((entry) => entry?.trim())
  )

const hasEducationContent = (item) => Boolean(item?.degree?.trim() || item?.institution?.trim())

function ResumeTemplatePreview({ data, template = 'modern', compact = false }) {
  const experienceItems = (data.experience || []).filter(hasExperienceContent)
  const educationItems = (data.education || []).filter(hasEducationContent)
  const skills = (data.skills || []).filter((item) => item?.trim())
  const summary = data.professionalSummary?.trim()
  const contact = [data.email, data.phone, data.location].filter(Boolean)
  const certificates = (data.certificatesText || '')
    .split('\n')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
  const hasReference = Boolean(
    data.referenceName?.trim() ||
      data.referenceRole?.trim() ||
      data.referenceOrganization?.trim() ||
      data.referenceContact?.trim()
  )
  const displayName = data.fullName?.trim() || 'Your Name'
  const displayRole = data.jobTitle?.trim() || 'Professional Title'
  const hasAnyContent =
    Boolean(data.fullName?.trim()) ||
    Boolean(data.jobTitle?.trim()) ||
    Boolean(summary) ||
    experienceItems.length > 0 ||
    educationItems.length > 0 ||
    skills.length > 0 ||
    certificates.length > 0 ||
    hasReference

  const shellPadding = compact ? 'p-3' : 'p-5'
  const contentPadding = compact ? 'p-3' : 'p-4'
  const textClass = compact ? 'text-[11px]' : 'text-sm'

  if (template === 'classic') {
    const splitIndex = Math.ceil(skills.length / 2)
    const technicalSkills = skills.slice(0, splitIndex)
    const softSkills = skills.slice(splitIndex)
    const classicContact = [
      data.email ? { key: 'email', icon: FaEnvelope, value: data.email } : null,
      data.phone ? { key: 'phone', icon: FaPhone, value: data.phone } : null,
      data.location ? { key: 'location', icon: FaMapMarkerAlt, value: data.location } : null,
    ].filter(Boolean)
    const classicLinks = [
      data.linkedin ? { key: 'linkedin', icon: FaLinkedin, value: data.linkedin } : null,
      data.github ? { key: 'github', icon: FaGithub, value: data.github } : null,
    ].filter(Boolean)

    return (
      <article className={`rounded-lg border border-slate-300 bg-white font-serif ${textClass}`}>
        <header className="px-5 pb-2 pt-5">
          <h2 className="text-4xl font-bold leading-none text-slate-900">{displayName}</h2>
          {displayRole && <p className="mt-1 text-base text-slate-700">{displayRole}</p>}

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-800">
            {classicContact.map((item) => {
              const Icon = item.icon
              return (
                <span key={item.key} className="inline-flex items-center gap-1.5">
                  <Icon className="text-xs" />
                  <span>{item.value}</span>
                </span>
              )
            })}
          </div>

          {classicLinks.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-800">
              {classicLinks.map((item) => {
                const Icon = item.icon
                return (
                  <span key={item.key} className="inline-flex items-center gap-1.5">
                    <Icon className="text-xs" />
                    <span>{item.value}</span>
                  </span>
                )
              })}
            </div>
          )}
        </header>

        <div className={`${shellPadding} space-y-4`}>
          <section>
            <h3 className="border-b-2 border-slate-900 pb-0.5 text-xl font-bold uppercase tracking-wide text-slate-900">
              Summary
            </h3>
            <p className="mt-1.5 leading-relaxed text-slate-800">
              {summary || 'Add your summary in the editor to show this section.'}
            </p>
          </section>

          {(educationItems.length > 0 || !hasAnyContent) && (
            <section>
              <h3 className="border-b-2 border-slate-900 pb-0.5 text-xl font-bold uppercase tracking-wide text-slate-900">
                Education
              </h3>
              <div className="mt-1.5 space-y-2">
                {educationItems.length > 0 ? (
                  educationItems.map((item) => (
                    <article key={item.id} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{item.degree || 'Degree'}</p>
                        <p className="italic text-slate-700">{item.institution || 'Institution'}</p>
                      </div>
                      <p className="whitespace-nowrap text-right text-sm text-slate-700">
                        {[item.startYear, item.endYear].filter(Boolean).join(' - ')}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-slate-500">Add your education to show this section.</p>
                )}
              </div>
            </section>
          )}

          {(experienceItems.length > 0 || !hasAnyContent) && (
            <section>
              <h3 className="border-b-2 border-slate-900 pb-0.5 text-xl font-bold uppercase tracking-wide text-slate-900">
                Projects
              </h3>
              <div className="mt-1.5 space-y-3">
                {experienceItems.length > 0 ? (
                  experienceItems.map((item) => (
                    <article key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-slate-900">{item.jobTitle || 'Project Title'}</p>
                        <p className="whitespace-nowrap text-sm text-slate-700">
                          {item.startDate || item.endDate
                            ? `${formatMonth(item.startDate)} - ${item.endDate ? formatMonth(item.endDate) : 'Present'}`
                            : ''}
                        </p>
                      </div>
                      <p className="italic text-slate-700">{item.company || 'Tech Stack / Context'}</p>

                      {item.achievements?.some((entry) => entry?.trim()) && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-800">
                          {item.achievements
                            .filter((entry) => entry?.trim())
                            .map((entry, index) => (
                              <li key={`${item.id}-${index}`}>{entry}</li>
                            ))}
                        </ul>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="text-slate-500">Add projects in the experience section to display them here.</p>
                )}
              </div>
            </section>
          )}

          {(skills.length > 0 || !hasAnyContent) && (
            <section>
              <h3 className="border-b-2 border-slate-900 pb-0.5 text-xl font-bold uppercase tracking-wide text-slate-900">
                Skills
              </h3>
              <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-bold text-slate-900">Technical Skills</p>
                  {technicalSkills.length > 0 ? (
                    <ul className="mt-1 list-disc pl-4 text-slate-800">
                      {technicalSkills.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-500">No skills added yet.</p>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900">Soft Skills</p>
                  {softSkills.length > 0 ? (
                    <ul className="mt-1 list-disc pl-4 text-slate-800">
                      {softSkills.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-slate-500">Add more skills to fill this column.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {(certificates.length > 0 || !hasAnyContent) && (
            <section>
              <h3 className="border-b-2 border-slate-900 pb-0.5 text-xl font-bold uppercase tracking-wide text-slate-900">
                Certificates
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {certificates.length > 0 ? (
                  certificates.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded border border-slate-700 px-2 py-1 text-sm text-slate-800"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="text-slate-500">Add certificates to show them here.</p>
                )}
              </div>
            </section>
          )}

          <section>
            <h3 className="border-b-2 border-slate-900 pb-0.5 text-xl font-bold uppercase tracking-wide text-slate-900">
              References
            </h3>
            {hasReference ? (
              <p className="mt-1.5 leading-relaxed text-slate-800">
                <span className="font-bold text-slate-900">{data.referenceName}</span>
                {data.referenceRole ? `, ${data.referenceRole}` : ''}
                {data.referenceOrganization ? `, ${data.referenceOrganization}` : ''}
                {data.referenceContact ? `, ${data.referenceContact}` : ''}
              </p>
            ) : (
              <p className="mt-1.5 text-slate-500">References available upon request.</p>
            )}
          </section>

          {!hasAnyContent && (
            <section className={`rounded-md border border-dashed border-slate-300 bg-slate-50 ${contentPadding}`}>
              <p className="text-slate-500">Start filling in your details to generate a live resume preview.</p>
            </section>
          )}
        </div>
      </article>
    )
  }

  if (template === 'creative') {
    const creativeLayout = compact ? 'grid-cols-1' : 'grid-cols-[34%_66%]'

    return (
      <article className={`overflow-hidden rounded-lg border border-slate-300 bg-white ${textClass}`}>
        <div className={`grid ${creativeLayout}`}>
          <aside className="bg-linear-to-b from-slate-800 to-slate-900 px-4 py-5 text-white">
            <h2 className="text-xl font-bold leading-tight">{displayName}</h2>
            <p className="mt-1 text-white/90">{displayRole}</p>

            <div className="mt-4 space-y-1 text-xs text-white/90">
              {(contact.length ? contact : ['email@example.com', '+1 (555) 123-4567', 'City, Country']).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>

            {skills.length > 0 && (
              <section className="mt-5">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">Core Skills</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {skills.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded-full border border-white/40 bg-white/20 px-2 py-0.5 text-[10px]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {summary && (
              <section className="mt-5">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">Summary</h3>
                <p className="mt-2 leading-relaxed text-white/90">{summary}</p>
              </section>
            )}
          </aside>

          <div className="space-y-4 px-4 py-5">
            {experienceItems.length > 0 && (
              <section>
                <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-700">
                  Experience Highlights
                </h3>
                <div className="mt-2 space-y-3">
                  {experienceItems.map((item) => (
                    <article key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.jobTitle || 'Job Title'}</p>
                          <p className="text-slate-600">{item.company || 'Company Name'}</p>
                        </div>
                        <p className="whitespace-nowrap text-xs text-slate-500">
                          {item.startDate || item.endDate
                            ? `${formatMonth(item.startDate)} - ${item.endDate ? formatMonth(item.endDate) : 'Present'}`
                            : ''}
                        </p>
                      </div>

                      {item.achievements?.some((entry) => entry?.trim()) && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-700">
                          {item.achievements
                            .filter((entry) => entry?.trim())
                            .map((entry, index) => (
                              <li key={`${item.id}-${index}`}>{entry}</li>
                            ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {educationItems.length > 0 && (
              <section>
                <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-700">
                  Education
                </h3>
                <div className="mt-2 space-y-2">
                  {educationItems.map((item) => (
                    <article key={item.id} className="rounded-md border border-slate-200 p-2.5">
                      <p className="font-semibold text-slate-900">{item.degree || 'Degree'}</p>
                      <div className="mt-0.5 flex items-center justify-between gap-3 text-slate-600">
                        <p>{item.institution || 'Institution'}</p>
                        <p className="text-xs text-slate-500">
                          {[item.startYear, item.endYear].filter(Boolean).join(' - ')}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {!hasAnyContent && (
              <section className={`rounded-md border border-dashed border-slate-300 bg-slate-50 ${contentPadding}`}>
                <p className="text-slate-500">Start filling in your details to generate a live resume preview.</p>
              </section>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className={`rounded-lg border border-slate-200 bg-white ${textClass}`}>
      <header className="grid gap-3 border-b border-indigo-100 bg-indigo-50/40 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-slate-900">{displayName}</h2>
          <p className="mt-1 font-semibold text-indigo-600">{displayRole}</p>
        </div>
        <div className="text-xs text-slate-600 sm:text-right">
          {(contact.length ? contact : ['email@example.com', '+1 (555) 123-4567', 'City, Country']).map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </header>

      <div className={`${shellPadding} grid gap-4 ${compact ? 'grid-cols-1' : 'md:grid-cols-[1.7fr_1fr]'}`}>
        <div className="space-y-4">
        {summary && (
          <section>
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Professional Summary
            </h3>
            <p className="mt-2 leading-relaxed text-slate-700">{summary}</p>
          </section>
        )}

        {experienceItems.length > 0 && (
          <section>
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Work Experience
            </h3>
            <div className="mt-2 space-y-3">
              {experienceItems.map((item) => (
                <article key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.jobTitle || 'Job Title'}</p>
                      <p className="text-slate-600">{item.company || 'Company Name'}</p>
                    </div>
                    <p className="whitespace-nowrap text-xs text-slate-500">
                      {item.startDate || item.endDate
                        ? `${formatMonth(item.startDate)} - ${item.endDate ? formatMonth(item.endDate) : 'Present'}`
                        : ''}
                    </p>
                  </div>

                  {item.achievements?.some((entry) => entry?.trim()) && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-700">
                      {item.achievements
                        .filter((entry) => entry?.trim())
                        .map((entry, index) => (
                          <li key={`${item.id}-${index}`}>{entry}</li>
                        ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {educationItems.length > 0 && (
          <section>
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Education
            </h3>
            <div className="mt-2 space-y-2">
              {educationItems.map((item) => (
                <article key={item.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.degree || 'Degree'}</p>
                    <p className="text-slate-600">{item.institution || 'Institution'}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {[item.startYear, item.endYear].filter(Boolean).join(' - ')}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
        </div>

        <div className="space-y-3">
        {skills.length > 0 && (
          <section>
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Skills
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((skill, index) => (
                <span key={`${skill}-${index}`} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}
        </div>

        {!hasAnyContent && (
          <section className={`rounded-md border border-dashed border-slate-300 bg-slate-50 ${contentPadding}`}>
            <p className="text-slate-500">Start filling in your details to generate a live resume preview.</p>
          </section>
        )}
      </div>
    </article>
  )
}

function ResumeBuilder() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [selectedTemplate, setSelectedTemplate] = useState('modern')
  const [skillInput, setSkillInput] = useState('')
  const printRef = useRef(null)

  const [userProfile, setUserProfile] = useState({
    name: 'Student Demo',
    email: 'student@demo.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Student',
  })

  const [resumeData, setResumeData] = useState({
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    professionalSummary: '',
    experience: [
      {
        id: 1,
        jobTitle: '',
        company: '',
        startDate: '',
        endDate: '',
        achievements: ['', '', ''],
      },
    ],
    education: [
      {
        id: 1,
        degree: '',
        institution: '',
        startYear: '',
        endYear: '',
      },
    ],
    skills: [],
    certificatesText: '',
    referenceName: '',
    referenceRole: '',
    referenceOrganization: '',
    referenceContact: '',
  })

  useEffect(() => {
    if (!user) return

    setUserProfile({
      name: user.fullName || user.name || user.email?.split('@')[0] || 'Student Demo',
      email: user.email || 'student@demo.com',
      avatar:
        user.avatarUrl ||
        user.avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'Student'}`,
    })

    setResumeData((prev) => ({
      ...prev,
      fullName: user.fullName || user.name || prev.fullName,
      email: user.email || prev.email,
    }))

    const savedData = localStorage.getItem('resumeBuilderData')
    if (!savedData) return

    try {
      const parsed = JSON.parse(savedData)

      // Supports both old and new local storage formats.
      if (parsed?.resumeData) {
        setResumeData((prev) => ({
          ...prev,
          ...parsed.resumeData,
        }))
        if (parsed.selectedTemplate) setSelectedTemplate(parsed.selectedTemplate)
      } else {
        setResumeData((prev) => ({
          ...prev,
          ...parsed,
        }))
      }
    } catch {
      // Ignore invalid local storage value.
    }
  }, [user])

  const updateResumeField = (field, value) => {
    setResumeData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const addExperience = () => {
    setResumeData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: Date.now(),
          jobTitle: '',
          company: '',
          startDate: '',
          endDate: '',
          achievements: ['', '', ''],
        },
      ],
    }))
  }

  const updateExperience = (id, field, value) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const updateAchievement = (id, index, value) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.map((item) => {
        if (item.id !== id) return item

        const nextAchievements = [...item.achievements]
        nextAchievements[index] = value
        return {
          ...item,
          achievements: nextAchievements,
        }
      }),
    }))
  }

  const removeExperience = (id) => {
    setResumeData((prev) => ({
      ...prev,
      experience:
        prev.experience.length > 1
          ? prev.experience.filter((item) => item.id !== id)
          : prev.experience,
    }))
  }

  const addEducation = () => {
    setResumeData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: Date.now(),
          degree: '',
          institution: '',
          startYear: '',
          endYear: '',
        },
      ],
    }))
  }

  const updateEducation = (id, field, value) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }))
  }

  const removeEducation = (id) => {
    setResumeData((prev) => ({
      ...prev,
      education:
        prev.education.length > 1
          ? prev.education.filter((item) => item.id !== id)
          : prev.education,
    }))
  }

  const addSkill = () => {
    const normalized = skillInput.trim()
    if (!normalized) return

    setResumeData((prev) => {
      if (prev.skills.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
        return prev
      }

      return {
        ...prev,
        skills: [...prev.skills, normalized],
      }
    })

    setSkillInput('')
  }

  const removeSkill = (index) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }))
  }

  const handleSaveResume = () => {
    setSaving(true)

    try {
      localStorage.setItem(
        'resumeBuilderData',
        JSON.stringify({ resumeData, selectedTemplate })
      )
      setMessage({ type: 'success', text: 'Resume draft saved successfully.' })
      setTimeout(() => setMessage({ type: '', text: '' }), 2500)
    } catch {
      setMessage({ type: 'error', text: 'Failed to save your resume draft.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!printRef.current) return

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const printWindow = window.open('', '', 'width=900,height=700')
      const printStyles = `
        <style>
          @page {
            margin: 0.7in;
          }
          body {
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
        </style>
      `

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>${resumeData.fullName || 'Resume'} - PDF</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            ${printStyles}
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `)

      printWindow.document.close()

      setTimeout(() => {
        printWindow.print()
        printWindow.close()
        setLoading(false)
        setMessage({
          type: 'success',
          text: 'Resume is ready. Use the print dialog to save as PDF.',
        })
      }, 450)
    } catch {
      setLoading(false)
      setMessage({
        type: 'error',
        text: 'Unable to generate PDF preview. Please try again.',
      })
    }
  }

  const hasAnyPreviewContent = useMemo(() => {
    return Boolean(
      resumeData.fullName?.trim() ||
        resumeData.jobTitle?.trim() ||
        resumeData.professionalSummary?.trim() ||
        resumeData.experience.some(hasExperienceContent) ||
        resumeData.education.some(hasEducationContent) ||
        resumeData.skills.length > 0
    )
  }, [resumeData])

  return (
    <div className="flex min-h-screen bg-[#f3f4f8]">
      <Sidebar />

      <div className="ml-52 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-end border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Notifications"
            >
              <FaBell className="text-lg" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                3
              </span>
            </button>

            <StudentProfileDropdown
              name={userProfile.name}
              email={userProfile.email}
              avatar={userProfile.avatar}
              className="border-l border-slate-200 pl-3"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f5f7fb] p-4 sm:p-6">
          <div className="mx-auto w-full max-w-375">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-4xl font-bold leading-none text-slate-900">Resume Builder</h1>
                <p className="mt-2 text-slate-600">Create a professional ATS-friendly resume</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveResume}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FaSave className="text-xs" />
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#5146ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FaDownload className="text-xs" />
                  {loading ? 'Generating...' : 'Download PDF'}
                </button>
              </div>
            </div>

            {message.text && (
              <div
                className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                  message.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <div className="space-y-4">
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="text-sm font-semibold text-slate-900">Choose Template</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {templateOptions.map((template) => {
                      const selected = selectedTemplate === template.id

                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`rounded-lg border p-3 text-left transition ${
                            selected
                              ? 'border-[#5146ff] bg-[#f4f3ff] shadow-[0_0_0_1px_#5146ff]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <TemplateMiniPreview templateId={template.id} />
                          <p className="font-semibold text-slate-900">{template.title}</p>
                          <p className="text-xs text-slate-500">{template.subtitle}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="text-2xl font-bold text-slate-900">Personal Information</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Full Name</label>
                      <input
                        value={resumeData.fullName}
                        onChange={(e) => updateResumeField('fullName', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Job Title</label>
                      <input
                        value={resumeData.jobTitle}
                        onChange={(e) => updateResumeField('jobTitle', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="Full Stack Developer"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                      <input
                        type="email"
                        value={resumeData.email}
                        onChange={(e) => updateResumeField('email', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Phone</label>
                      <input
                        value={resumeData.phone}
                        onChange={(e) => updateResumeField('phone', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Location</label>
                      <input
                        value={resumeData.location}
                        onChange={(e) => updateResumeField('location', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="San Francisco, CA"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">LinkedIn</label>
                      <input
                        value={resumeData.linkedin}
                        onChange={(e) => updateResumeField('linkedin', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="linkedin.com/in/yourname"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">GitHub</label>
                      <input
                        value={resumeData.github}
                        onChange={(e) => updateResumeField('github', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="github.com/yourname"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="text-2xl font-bold text-slate-900">Professional Summary</h2>
                  <textarea
                    value={resumeData.professionalSummary}
                    onChange={(e) => updateResumeField('professionalSummary', e.target.value)}
                    className="mt-4 min-h-24 w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                    placeholder="Write a brief professional summary..."
                  />
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">Work Experience</h2>
                    <button
                      onClick={addExperience}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FaPlus className="text-xs" />
                      Add
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {resumeData.experience.map((exp) => (
                      <div key={exp.id} className="rounded-lg border border-slate-200 bg-[#fbfcff] p-3">
                        <div className="mb-3 flex items-start justify-end">
                          {resumeData.experience.length > 1 && (
                            <button
                              onClick={() => removeExperience(exp.id)}
                              className="text-rose-500 transition hover:text-rose-600"
                              aria-label="Delete experience"
                            >
                              <FaTrashAlt className="text-xs" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            value={exp.jobTitle}
                            onChange={(e) => updateExperience(exp.id, 'jobTitle', e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                            placeholder="Job Title"
                          />
                          <input
                            value={exp.company}
                            onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                            placeholder="Company Name"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              type="month"
                              value={exp.startDate}
                              onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                              className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                            />
                            <input
                              type="month"
                              value={exp.endDate}
                              onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                              className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                            />
                          </div>
                          <div className="rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2">
                            {exp.achievements.map((item, index) => (
                              <input
                                key={`${exp.id}-${index}`}
                                value={item}
                                onChange={(e) => updateAchievement(exp.id, index, e.target.value)}
                                className="w-full border-0 bg-transparent py-0.5 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                                placeholder="• Achievement or responsibility"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">Education</h2>
                    <button
                      onClick={addEducation}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FaPlus className="text-xs" />
                      Add
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {resumeData.education.map((edu) => (
                      <div key={edu.id} className="rounded-lg border border-slate-200 bg-[#fbfcff] p-3">
                        <div className="mb-3 flex items-start justify-end">
                          {resumeData.education.length > 1 && (
                            <button
                              onClick={() => removeEducation(edu.id)}
                              className="text-rose-500 transition hover:text-rose-600"
                              aria-label="Delete education"
                            >
                              <FaTrashAlt className="text-xs" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <input
                            value={edu.degree}
                            onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                            placeholder="Degree"
                          />
                          <input
                            value={edu.institution}
                            onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                            placeholder="Institution"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              value={edu.startYear}
                              onChange={(e) => updateEducation(edu.id, 'startYear', e.target.value)}
                              className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                              placeholder="Start Year"
                            />
                            <input
                              value={edu.endYear}
                              onChange={(e) => updateEducation(edu.id, 'endYear', e.target.value)}
                              className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                              placeholder="End Year"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="text-2xl font-bold text-slate-900">Skills</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {resumeData.skills.map((skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        className="inline-flex items-center gap-1 rounded-md bg-[#eef1ff] px-2.5 py-1 text-xs font-semibold text-[#4f46e5]"
                      >
                        {skill}
                        <button
                          onClick={() => removeSkill(index)}
                          className="text-[10px] text-[#6366f1] transition hover:text-[#4338ca]"
                          aria-label={`Remove ${skill}`}
                        >
                          <FaTimes />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="mt-3">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSkill()
                        }
                      }}
                      className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                      placeholder="Add a skill and press Enter"
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="text-2xl font-bold text-slate-900">Certificates</h2>
                  <p className="mt-1 text-sm text-slate-500">Add one certificate per line.</p>
                  <textarea
                    value={resumeData.certificatesText}
                    onChange={(e) => updateResumeField('certificatesText', e.target.value)}
                    className="mt-3 min-h-20 w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                    placeholder="AWS Academy Data Engineering\nAWS Academy Cloud Foundations"
                  />
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="text-2xl font-bold text-slate-900">Reference</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Name</label>
                      <input
                        value={resumeData.referenceName}
                        onChange={(e) => updateResumeField('referenceName', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="Mr. Santosh Parajuli"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Role</label>
                      <input
                        value={resumeData.referenceRole}
                        onChange={(e) => updateResumeField('referenceRole', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="Program Leader"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Organization</label>
                      <input
                        value={resumeData.referenceOrganization}
                        onChange={(e) => updateResumeField('referenceOrganization', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="Ithari International College"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Contact</label>
                      <input
                        value={resumeData.referenceContact}
                        onChange={(e) => updateResumeField('referenceContact', e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-[#f8fafc] px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300"
                        placeholder="santosh.parajuli@example.com"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <aside className="lg:self-start">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900">
                    <FaEye className="text-sm" />
                    <h3 className="text-sm font-semibold">Live Preview</h3>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">Full resume preview (updates live)</p>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-[#f8fafc] p-3 sm:p-4">
                    {hasAnyPreviewContent ? (
                      <div className="mx-auto w-full max-w-4xl">
                        <ResumeTemplatePreview
                          data={resumeData}
                          template={selectedTemplate}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-48 items-center justify-center text-center text-slate-400">
                        <div>
                          <FaRegFileAlt className="mx-auto text-4xl" />
                          <p className="mt-2 text-sm">Resume preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>

      <div className="hidden">
        <div ref={printRef} className="mx-auto max-w-225 p-4">
          <ResumeTemplatePreview data={resumeData} template={selectedTemplate} />
        </div>
      </div>
    </div>
  )
}

export default ResumeBuilder
