import { useEffect, useMemo, useState } from 'react';
import { FaEdit, FaPlus, FaSearch, FaTimes, FaTrash } from 'react-icons/fa';
import AdminLayout from '../../components/AdminLayout';
import { careerAPI } from '../../utils/api';
import { useAdminNotification } from '../../context/AdminNotificationContext';

const emptyForm = {
  careerName: '',
  category: 'technology',
  experienceLevel: 'entry',
  marketDemand: 'medium',
  growthOutlook: 'stable',
  description: '',
  requiredSkillsTech: '',
  requiredSkillsSoft: '',
  preferredEducationLevels: [],
  experienceMin: '',
  experienceMax: '',
  salaryMin: '',
  salaryMax: '',
  certifications: '',
  workEnvironment: [],
};

const educationLevels = ['secondary', 'bachelor', 'master', 'phd', 'any'];
const workEnvironments = ['remote', 'hybrid', 'onsite', 'travel'];

const splitList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const humanize = (value = '') =>
  value
    .toString()
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatCurrency = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const demandStyleMap = {
  low: 'bg-rose-50 text-rose-700 border border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  high: 'bg-sky-50 text-sky-700 border border-sky-200',
  'very-high': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const growthStyleMap = {
  declining: 'text-rose-600',
  stable: 'text-amber-600',
  growing: 'text-sky-600',
  'rapid-growth': 'text-emerald-600',
};

function CareerManagement() {
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const { notify } = useAdminNotification();

  const loadCareers = async () => {
    setLoading(true);
    try {
      const response = await careerAPI.getAllCareers({ limit: 100 });
      const payload = response?.data || response;
      setCareers(payload?.careers || payload?.data || []);
    } catch (err) {
      notify(err.message || 'Failed to load careers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCareers();
  }, []);

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleArrayValue = (field, value) => {
    setFormData((prev) => {
      const list = prev[field];
      if (list.includes(value)) {
        return { ...prev, [field]: list.filter((item) => item !== value) };
      }
      return { ...prev, [field]: [...list, value] };
    });
  };

  const handleEdit = async (careerId) => {
    try {
      const response = await careerAPI.getCareerDetails(careerId);
      const payload = response?.data || response;
      const career = payload?.data || payload;
      setEditingId(career._id);
      setFormData({
        careerName: career.careerName || '',
        category: career.category || 'technology',
        experienceLevel: career.experienceLevel || 'entry',
        marketDemand: career.marketDemand || 'medium',
        growthOutlook: career.growthOutlook || 'stable',
        description: career.description || '',
        requiredSkillsTech: (career.requiredSkills?.technical || []).join(', '),
        requiredSkillsSoft: (career.requiredSkills?.soft || []).join(', '),
        preferredEducationLevels: (career.preferredEducation || []).map((e) => e.level).filter(Boolean),
        experienceMin: career.experienceYearsRange?.min?.toString() || '',
        experienceMax: career.experienceYearsRange?.max?.toString() || '',
        salaryMin: career.salaryRange?.min?.toString() || '',
        salaryMax: career.salaryRange?.max?.toString() || '',
        certifications: (career.certifications || []).join(', '),
        workEnvironment: career.workEnvironment || [],
      });
      setIsModalOpen(true);
    } catch (err) {
      notify(err.message || 'Failed to load career details', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      careerName: formData.careerName,
      category: formData.category,
      experienceLevel: formData.experienceLevel,
      marketDemand: formData.marketDemand,
      growthOutlook: formData.growthOutlook,
      description: formData.description,
      requiredSkills: {
        technical: splitList(formData.requiredSkillsTech),
        soft: splitList(formData.requiredSkillsSoft),
      },
      preferredEducation: formData.preferredEducationLevels.map((level) => ({
        level,
        fields: [],
      })),
      experienceYearsRange: {
        min: formData.experienceMin ? Number(formData.experienceMin) : 0,
        max: formData.experienceMax ? Number(formData.experienceMax) : 99,
      },
      salaryRange: {
        min: formData.salaryMin ? Number(formData.salaryMin) : undefined,
        max: formData.salaryMax ? Number(formData.salaryMax) : undefined,
        currency: 'USD',
      },
      certifications: splitList(formData.certifications),
      workEnvironment: formData.workEnvironment,
    };

    try {
      if (editingId) {
        await careerAPI.updateCareer(editingId, payload);
        notify('Career updated successfully.', 'success');
      } else {
        await careerAPI.createCareer(payload);
        notify('Career created successfully.', 'success');
      }
      closeModal();
      loadCareers();
    } catch (err) {
      notify(err.message || 'Failed to save career', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (careerId, careerName) => {
    const confirmed = window.confirm(
      `Delete ${careerName || 'this career profile'}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await careerAPI.deleteCareer(careerId);
      notify('Career removed successfully.', 'success');
      loadCareers();
    } catch (err) {
      notify(err.message || 'Failed to delete career', 'error');
    }
  };

  const filteredCareers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return careers;
    }

    return careers.filter((career) => {
      const searchable = [
        career.careerName,
        career.category,
        career.experienceLevel,
        career.marketDemand,
        career.growthOutlook,
        ...(career.requiredSkills?.technical || []),
        ...(career.requiredSkills?.soft || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [careers, searchTerm]);

  const metrics = useMemo(() => {
    const total = careers.length;
    const highDemand = careers.filter(
      (career) => career.marketDemand === 'high' || career.marketDemand === 'very-high',
    ).length;
    const rapidGrowth = careers.filter((career) => career.growthOutlook === 'rapid-growth').length;

    return { total, highDemand, rapidGrowth };
  }, [careers]);

  return (
    <AdminLayout
      title="Career Profiles"
      eyebrow="Career Management"
      subtitle="Manage career paths and requirements with a clean, searchable library."
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Profiles</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{metrics.total}</p>
            <p className="mt-1 text-sm text-slate-500">Career paths currently available</p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">High Demand</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-900">{metrics.highDemand}</p>
            <p className="mt-1 text-sm text-emerald-800/80">Marked high or very high demand</p>
          </article>
          <article className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Rapid Growth</p>
            <p className="mt-2 text-3xl font-extrabold text-sky-900">{metrics.rapidGrowth}</p>
            <p className="mt-1 text-sm text-sky-800/80">Profiles with accelerating outlook</p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-2xl">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, category, level, or skill"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 focus:outline-none focus:border-slate-300 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-800">{filteredCareers.length}</span> of {careers.length}
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-800 transition"
              >
                <FaPlus className="text-xs" />
                Add Career
              </button>
              <button
                type="button"
                onClick={loadCareers}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
            <p className="text-sm text-slate-500">Loading career profiles...</p>
          </section>
        ) : filteredCareers.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
            <p className="text-base font-semibold text-slate-700">No career profiles found</p>
            <p className="mt-1 text-sm text-slate-500">Try a different search term or create a new profile.</p>
          </section>
        ) : (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredCareers.map((career) => {
              const technicalSkills = career.requiredSkills?.technical || [];
              const softSkills = career.requiredSkills?.soft || [];
              const demandStyle = demandStyleMap[career.marketDemand] || demandStyleMap.medium;
              const growthStyle = growthStyleMap[career.growthOutlook] || 'text-slate-700';

              return (
                <article
                  key={career._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-2xl font-extrabold text-slate-900 leading-tight wrap-break-word">{career.careerName}</h3>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {humanize(career.category)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {career.description || 'No description added for this career profile yet.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(career._id)}
                        className="h-9 w-9 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                        aria-label={`Edit ${career.careerName}`}
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(career._id, career.careerName)}
                        className="h-9 w-9 grid place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                        aria-label={`Delete ${career.careerName}`}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Experience Level</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{humanize(career.experienceLevel)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Market Demand</p>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${demandStyle}`}>
                        {humanize(career.marketDemand)}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Growth Outlook</p>
                      <p className={`mt-1 text-sm font-semibold ${growthStyle}`}>{humanize(career.growthOutlook)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-slate-500">Salary Range</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatCurrency(career.salaryRange?.min)} - {formatCurrency(career.salaryRange?.max)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">Technical Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {technicalSkills.length > 0 ? (
                          technicalSkills.map((skill) => (
                            <span
                              key={`${career._id}-${skill}`}
                              className="inline-flex rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No technical skills listed.</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">Soft Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {softSkills.length > 0 ? (
                          softSkills.map((skill) => (
                            <span
                              key={`${career._id}-soft-${skill}`}
                              className="inline-flex rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No soft skills listed.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
            onClick={closeModal}
            aria-label="Close career form"
          />

          <div className="absolute inset-0 p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Career Profile</p>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                    {editingId ? 'Edit Career Profile' : 'Create Career Profile'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-9 w-9 grid place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Close modal"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Career Name</label>
                    <input
                      type="text"
                      name="careerName"
                      value={formData.careerName}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Full Stack Developer"
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <option value="technology">Technology</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="finance">Finance</option>
                      <option value="education">Education</option>
                      <option value="engineering">Engineering</option>
                      <option value="creative">Creative</option>
                      <option value="business">Business</option>
                      <option value="science">Science</option>
                      <option value="legal">Legal</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Describe the career path and core expectations"
                    className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Experience Level</label>
                    <select
                      name="experienceLevel"
                      value={formData.experienceLevel}
                      onChange={handleChange}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <option value="entry">Entry</option>
                      <option value="mid">Mid</option>
                      <option value="senior">Senior</option>
                      <option value="lead">Lead</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Market Demand</label>
                    <select
                      name="marketDemand"
                      value={formData.marketDemand}
                      onChange={handleChange}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="very-high">Very High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Growth Outlook</label>
                    <select
                      name="growthOutlook"
                      value={formData.growthOutlook}
                      onChange={handleChange}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <option value="declining">Declining</option>
                      <option value="stable">Stable</option>
                      <option value="growing">Growing</option>
                      <option value="rapid-growth">Rapid Growth</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Salary Min ($)</label>
                    <input
                      type="number"
                      min="0"
                      name="salaryMin"
                      value={formData.salaryMin}
                      onChange={handleChange}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Salary Max ($)</label>
                    <input
                      type="number"
                      min="0"
                      name="salaryMax"
                      value={formData.salaryMax}
                      onChange={handleChange}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Technical Skills (comma-separated)</label>
                    <input
                      type="text"
                      name="requiredSkillsTech"
                      value={formData.requiredSkillsTech}
                      onChange={handleChange}
                      placeholder="JavaScript, React, Node.js"
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Soft Skills (comma-separated)</label>
                    <input
                      type="text"
                      name="requiredSkillsSoft"
                      value={formData.requiredSkillsSoft}
                      onChange={handleChange}
                      placeholder="Communication, Collaboration"
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">Certifications (comma-separated)</label>
                  <input
                    type="text"
                    name="certifications"
                    value={formData.certifications}
                    onChange={handleChange}
                    placeholder="AWS Certified Developer, PMP"
                    className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Preferred Education</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {educationLevels.map((level) => {
                        const selected = formData.preferredEducationLevels.includes(level);

                        return (
                          <button
                            type="button"
                            key={level}
                            onClick={() => toggleArrayValue('preferredEducationLevels', level)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                              selected
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {humanize(level)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Work Environment</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {workEnvironments.map((env) => {
                        const selected = formData.workEnvironment.includes(env);

                        return (
                          <button
                            type="button"
                            key={env}
                            onClick={() => toggleArrayValue('workEnvironment', env)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                              selected
                                ? 'bg-sky-600 border-sky-600 text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {humanize(env)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Experience Years (Min)</label>
                    <input
                      type="number"
                      min="0"
                      name="experienceMin"
                      value={formData.experienceMin}
                      onChange={handleChange}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Experience Years (Max)</label>
                    <input
                      type="number"
                      min="0"
                      name="experienceMax"
                      value={formData.experienceMax}
                      onChange={handleChange}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <FaPlus className="text-xs" />
                    {submitting
                      ? editingId
                        ? 'Updating...'
                        : 'Creating...'
                      : editingId
                      ? 'Update Career Profile'
                      : 'Create Career Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default CareerManagement;
