import React, { useEffect, useMemo, useState } from 'react';
import {
  FaArrowUp,
  FaBell,
  FaBriefcase,
  FaBuilding,
  FaCheckCircle,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaMapPin,
  FaSearch,
  FaSync,
  FaTimes,
  FaTimesCircle,
  FaTrophy,
} from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import StudentProfileDropdown from '../components/StudentProfileDropdown';
import { useAuth } from '../context/AuthContext';
import { careerAPI, resumeAPI } from '../utils/api';

const isValidObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

const formatCategoryLabel = (value) => {
  if (!value) return 'General';
  return value
    .toString()
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatSalaryRange = (salaryRange) => {
  if (!salaryRange || (salaryRange.min == null && salaryRange.max == null)) return 'N/A';

  const formatCurrency = (amount, currency = 'USD') => {
    if (amount == null) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const currency = salaryRange.currency || 'USD';
  const min = formatCurrency(salaryRange.min, currency);
  const max = formatCurrency(salaryRange.max, currency);

  if (min && max) return `${min} - ${max}`;
  return min || max || 'N/A';
};

const formatExperienceRange = (experienceYearsRange, experienceLevel) => {
  if (experienceYearsRange?.min != null || experienceYearsRange?.max != null) {
    const min = experienceYearsRange.min ?? 0;
    const max = experienceYearsRange.max ?? min;
    return `${min}-${max} years`;
  }

  const map = {
    entry: '1-4 years',
    mid: '2-5 years',
    senior: '3-7 years',
    lead: '5+ years',
  };

  return map[experienceLevel] || '2-5 years';
};

const getGrowthLabel = (growthPotential, marketDemand) => {
  const raw = (growthPotential || marketDemand || 'medium').toLowerCase();

  if (raw.includes('very') || raw.includes('rapid')) return 'Very High';
  if (raw.includes('high') || raw.includes('grow')) return 'High';
  if (raw.includes('low') || raw.includes('declin')) return 'Low';
  return 'Medium';
};

const getGrowthTone = (label) => {
  if (label === 'Very High') return 'bg-emerald-100 text-emerald-700';
  if (label === 'High') return 'bg-blue-100 text-blue-700';
  if (label === 'Low') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-700';
};

const getDefaultCompanies = (category) => {
  const normalized = (category || '').toLowerCase();

  if (normalized.includes('software') || normalized.includes('tech') || normalized.includes('development')) {
    return ['Google', 'Meta', 'Amazon', 'Microsoft'];
  }

  if (normalized.includes('design')) {
    return ['Adobe', 'Figma', 'Canva', 'Airbnb'];
  }

  if (normalized.includes('data')) {
    return ['Databricks', 'Oracle', 'IBM', 'Snowflake'];
  }

  return ['Google', 'Amazon', 'Microsoft', 'Accenture'];
};

const getFallbackFindJobsUrl = (careerTitle) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${careerTitle} jobs`)}`;

function CareerRecommendation() {
  const { user } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [detailsCareer, setDetailsCareer] = useState(null);

  const [userProfile, setUserProfile] = useState({
    name: 'User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
  });

  const [careerMatches, setCareerMatches] = useState([]);
  const [resumeType, setResumeType] = useState(null);
  const [hasResume, setHasResume] = useState(true);

  const [summaryStats, setSummaryStats] = useState([
    { label: 'Top Match', value: '--', tone: 'text-emerald-600' },
    { label: 'Average Match', value: '--', tone: 'text-[#5b5ee7]' },
    { label: 'Career Paths', value: '--', tone: 'text-slate-900' },
    { label: 'New This Week', value: '--', tone: 'text-[#7c3aed]' },
  ]);

  const [urlParams, setUrlParams] = useState({
    career: null,
    level: null,
    skills: null,
    location: null,
  });
  const [autoSearchActive, setAutoSearchActive] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const parsedParams = {
      career: params.get('career'),
      level: params.get('level'),
      skills: params.get('skills'),
      location: params.get('location'),
    };

    if (Object.values(parsedParams).some((v) => v !== null)) {
      setUrlParams(parsedParams);
      setAutoSearchActive(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.fullName || user.name || user.email?.split('@')[0] || 'User',
        avatar:
          user.avatarUrl ||
          user.avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'User'}`,
      });
    }

    if (autoSearchActive && Object.values(urlParams).some((v) => v !== null)) {
      handleAutoSearch();
    } else {
      loadRecommendations();
    }
  }, [user, autoSearchActive]);

  const handleAutoSearch = async () => {
    setLoading(true);
    setError('');

    try {
      await careerAPI.generateRecommendations({
        searchCriteria: {
          career: urlParams.career,
          level: urlParams.level,
          skills: urlParams.skills ? urlParams.skills.split(',').map((s) => s.trim()) : null,
          location: urlParams.location,
        },
      });

      await loadRecommendations();
    } catch (err) {
      console.error('Error in auto-search:', err);
      let errorMessage = err.message || 'Failed to generate recommendations';
      if (!errorMessage.toLowerCase().includes('resume')) {
        errorMessage += '. Please ensure your resume is uploaded.';
      }
      setError(errorMessage);
      await loadRecommendations();
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    setLoading(true);
    setError('');

    try {
      try {
        const resumeResponse = await resumeAPI.getResume();
        const resumeData = resumeResponse?.data || resumeResponse;
        setHasResume(Boolean(resumeData));
        if (resumeData?.resume_type) {
          setResumeType(resumeData.resume_type);
        }
      } catch {
        setHasResume(false);
      }

      const response = await careerAPI.getRecommendations();
      const recommendationDoc = response?.data || response;
      const recommendations = recommendationDoc?.recommendations || [];

      const formattedCareers = recommendations.map((career) => {
        const rawCareerId = career?.careerId?._id ?? career?.careerId ?? null;
        const normalizedCareerId =
          typeof rawCareerId === 'string'
            ? rawCareerId
            : rawCareerId?.toString?.() || null;

        const careerId = isValidObjectId(normalizedCareerId) ? normalizedCareerId : null;

        const careerDoc =
          career?.careerId && typeof career.careerId === 'object'
            ? career.careerId
            : {};

        const title =
          career?.careerName ||
          career?.name ||
          careerDoc?.careerName ||
          'Career Path';

        const category = formatCategoryLabel(career?.category || careerDoc?.category || 'General');

        const aiInsight =
          career?.aiInsights ||
          (Array.isArray(career?.matchReasons) && career.matchReasons.length > 0
            ? career.matchReasons.join('. ')
            : 'This role aligns well with your profile and current skill strengths.');

        const skillGaps = Array.isArray(career?.skillGaps) ? career.skillGaps : [];
        const requiredTech = Array.isArray(careerDoc?.requiredSkills?.technical)
          ? careerDoc.requiredSkills.technical
          : [];
        const requiredSoft = Array.isArray(careerDoc?.requiredSkills?.soft)
          ? careerDoc.requiredSkills.soft
          : [];

        const matchedSkills = [...requiredTech, ...requiredSoft]
          .filter(
            (skill) =>
              !skillGaps.some((gap) => gap.toLowerCase() === skill.toLowerCase())
          )
          .slice(0, 6);

        const growthLabel = getGrowthLabel(career?.growthPotential, careerDoc?.marketDemand);

        const remoteFriendly =
          Array.isArray(careerDoc?.workEnvironment) &&
          careerDoc.workEnvironment.includes('remote');

        return {
          careerId,
          title,
          category,
          matchScore: Number(career?.matchScore || 0),
          description:
            careerDoc?.description ||
            'Explore this path to grow your career opportunities.',
          aiInsight,
          skillGaps,
          matchedSkills,
          growthLabel,
          salaryRange: careerDoc?.salaryRange || null,
          experienceYearsRange: careerDoc?.experienceYearsRange || null,
          experienceLevel: careerDoc?.experienceLevel || null,
          topCompanies: getDefaultCompanies(category),
          jobSearch: career?.jobSearch || null,
          remoteFriendly,
        };
      });

      setCareerMatches(formattedCareers);

      if (formattedCareers.length > 0) {
        const topMatch = Math.max(...formattedCareers.map((item) => item.matchScore || 0));
        const avgMatch = Math.round(
          formattedCareers.reduce((sum, item) => sum + (item.matchScore || 0), 0) /
            formattedCareers.length
        );

        setSummaryStats([
          { label: 'Top Match', value: `${topMatch}%`, tone: 'text-emerald-600' },
          { label: 'Average Match', value: `${avgMatch}%`, tone: 'text-[#5b5ee7]' },
          { label: 'Career Paths', value: `${formattedCareers.length}`, tone: 'text-slate-900' },
          {
            label: 'New This Week',
            value: `${Math.min(3, formattedCareers.length)}`,
            tone: 'text-[#7c3aed]',
          },
        ]);
      } else {
        setSummaryStats([
          { label: 'Top Match', value: '--', tone: 'text-emerald-600' },
          { label: 'Average Match', value: '--', tone: 'text-[#5b5ee7]' },
          { label: 'Career Paths', value: '--', tone: 'text-slate-900' },
          { label: 'New This Week', value: '--', tone: 'text-[#7c3aed]' },
        ]);
      }
    } catch (err) {
      setCareerMatches([]);
      setError(err.message || 'Failed to load recommendations. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    setLoading(true);
    setError('');

    try {
      await careerAPI.generateRecommendations();
      await loadRecommendations();
    } catch (err) {
      let errorMessage = err.message || 'Failed to generate recommendations';

      if (errorMessage.toLowerCase().includes('resume')) {
        errorMessage += '. Please upload your resume in ATS Scanner first.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (career) => {
    if (!isValidObjectId(career?.careerId)) {
      setDetailsOpen(true);
      setDetailsLoading(false);
      setDetailsError('');
      setDetailsCareer({
        careerName: career?.title || 'Career Details',
        category: career?.category || 'General',
        description: career?.description || 'No details available.',
        matchScore: career?.matchScore || 0,
        aiInsight: career?.aiInsight || '',
        skillGaps: Array.isArray(career?.skillGaps) ? career.skillGaps : [],
        matchedSkills: Array.isArray(career?.matchedSkills) ? career.matchedSkills : [],
        salaryRange: career?.salaryRange || null,
        experienceYearsRange: career?.experienceYearsRange || null,
        experienceLevel: career?.experienceLevel || null,
        topCompanies: career?.topCompanies || getDefaultCompanies(career?.category),
        jobSearch: career?.jobSearch || null,
        isFallbackDetails: true,
      });
      return;
    }

    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError('');
    setDetailsCareer(null);

    try {
      const response = await careerAPI.getCareerDetails(career.careerId);
      const detail = response?.data || response;

      setDetailsCareer({
        ...detail,
        careerName: detail?.careerName || career.title,
        category: formatCategoryLabel(detail?.category || career.category),
        description: detail?.description || career.description,
        matchScore: career.matchScore,
        aiInsight: career.aiInsight,
        matchedSkills:
          career.matchedSkills?.length > 0
            ? career.matchedSkills
            : detail?.requiredSkills?.technical?.slice(0, 5) || [],
        skillGaps: Array.isArray(career.skillGaps) ? career.skillGaps : [],
        salaryRange: detail?.salaryRange || career.salaryRange,
        experienceYearsRange: detail?.experienceYearsRange || career.experienceYearsRange,
        experienceLevel: detail?.experienceLevel || career.experienceLevel,
        topCompanies: detail?.topCompanies || career.topCompanies || getDefaultCompanies(career.category),
        jobSearch: career.jobSearch || detail?.jobSearch || null,
      });
    } catch (err) {
      setDetailsError(err.message || 'Failed to load career details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredCareers = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return careerMatches.filter((career) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        career.title.toLowerCase().includes(normalizedQuery) ||
        career.category.toLowerCase().includes(normalizedQuery) ||
        career.description.toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) return false;

      if (activeFilter === 'all') return true;
      if (activeFilter === 'high') return career.matchScore >= 80;
      if (activeFilter === 'growth') {
        return career.growthLabel === 'High' || career.growthLabel === 'Very High';
      }
      if (activeFilter === 'entry') {
        const minYears = career.experienceYearsRange?.min;
        return minYears == null ? career.experienceLevel === 'entry' : minYears <= 1;
      }
      if (activeFilter === 'remote') return career.remoteFriendly;

      return true;
    });
  }, [careerMatches, searchTerm, activeFilter]);

  const openFindJobs = (career) => {
    const firstPortal = career?.jobSearch?.job_portals?.[0];
    const url = firstPortal?.search_url || getFallbackFindJobsUrl(career.title || 'jobs');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'high', label: 'High Match (80%+)' },
    { id: 'growth', label: 'Growing Demand' },
    { id: 'entry', label: 'Entry Level' },
    { id: 'remote', label: 'Remote Friendly' },
  ];

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
              email={user?.email || 'student@demo.com'}
              avatar={userProfile.avatar}
              className="border-l border-slate-200 pl-3"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f5f7fb] p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-4xl font-bold leading-none text-slate-900">Career Recommendations</h1>
                <p className="mt-2 text-slate-600">Personalized career paths based on your profile</p>
              </div>

              <button
                onClick={handleGenerateRecommendations}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#5b5ee7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d50d4] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FaSync className={loading ? 'animate-spin' : ''} />
                {loading ? 'Refreshing...' : 'Refresh Recommendations'}
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {resumeType === 'Non-Technical' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Non-technical resume detected. Recommendations may be less accurate for purely technical paths.
              </div>
            )}

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {summaryStats.map((stat) => (
                <article key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className={`mt-1 text-4xl font-bold leading-none ${stat.tone}`}>{stat.value}</p>
                </article>
              ))}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative lg:w-72">
                  <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search careers..."
                    className="w-full rounded-lg border border-slate-200 bg-[#f8fafc] py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#5b5ee7]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {filterOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setActiveFilter(option.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        activeFilter === option.id
                          ? 'border-[#5b5ee7] bg-[#f2f1ff] text-[#4a43c7]'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {!hasResume && (
              <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                <FaExclamationCircle className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Upload your resume for better matches</p>
                  <p className="text-sm text-amber-700">We can provide more accurate career recommendations if you upload your resume for analysis.</p>
                </div>
              </section>
            )}

            {!loading && filteredCareers.length === 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                No career recommendations found. Try refreshing recommendations or adjusting filters.
              </section>
            )}

            <section className="grid gap-4 lg:grid-cols-2">
              {filteredCareers.map((career) => {
                const growthTone = getGrowthTone(career.growthLabel);

                return (
                  <article key={`${career.careerId || career.title}-${career.matchScore}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-3xl font-bold leading-none text-slate-900">{career.title}</h3>
                        <span className="mt-2 inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {career.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-5xl font-bold leading-none text-emerald-600">{career.matchScore}%</p>
                        <p className="mt-1 text-xs text-slate-500">Match</p>
                      </div>
                    </div>

                    <p className="mt-4 min-h-12 text-sm leading-7 text-slate-600">{career.description}</p>

                    <div className="mt-4 rounded-lg border border-[#dddafc] bg-[#f4f3ff] p-3">
                      <p className="text-sm text-slate-700">
                        <span className="mr-1 inline-flex items-center text-[#5b5ee7]">◎</span>
                        {career.aiInsight}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Growth</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${growthTone}`}>
                          {career.growthLabel}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Salary Range</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{formatSalaryRange(career.salaryRange)}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Experience</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatExperienceRange(career.experienceYearsRange, career.experienceLevel)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Skill Gaps</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{career.skillGaps.length} skills</p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleViewDetails(career)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => openFindJobs(career)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6d5ef7] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#5a4ee0]"
                      >
                        <FaExternalLinkAlt className="text-xs" />
                        Find Jobs
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </main>
      </div>

      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailsOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setDetailsOpen(false)}
              className="absolute right-8 top-8 text-slate-500 transition hover:text-slate-700"
              aria-label="Close"
            >
              <FaTimes className="text-xl" />
            </button>

            {detailsLoading && <p className="text-slate-600">Loading details...</p>}

            {!detailsLoading && detailsError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {detailsError}
              </div>
            )}

            {!detailsLoading && detailsCareer && (
              <div className="space-y-6">
                <header>
                  <h3 className="text-5xl font-bold leading-none text-slate-900">
                    {detailsCareer.careerName || detailsCareer.name || 'Career Details'}
                  </h3>
                  <p className="mt-2 text-lg text-slate-500">
                    {detailsCareer.category || 'General'} • {detailsCareer.matchScore || 0}% Match
                  </p>
                </header>

                <section>
                  <h4 className="text-2xl font-bold text-slate-900">About This Role</h4>
                  <p className="mt-2 text-lg leading-8 text-slate-600">
                    {detailsCareer.description || 'No description available for this role.'}
                  </p>
                </section>

                <section className="rounded-xl border border-[#dddafc] bg-[#f4f3ff] p-4">
                  <h4 className="text-2xl font-bold text-slate-900">◎ AI Career Insight</h4>
                  <p className="mt-2 text-lg leading-8 text-slate-700">{detailsCareer.aiInsight || 'Career insight is not available for this role yet.'}</p>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900">
                      <FaCheckCircle className="text-emerald-500" />
                      Your Matched Skills
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(detailsCareer.matchedSkills || []).length > 0 ? (
                        (detailsCareer.matchedSkills || []).map((skill, idx) => (
                          <span key={`matched-${idx}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No matched skills available yet.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900">
                      <FaTimesCircle className="text-amber-500" />
                      Skills to Learn
                    </h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(detailsCareer.skillGaps || []).length > 0 ? (
                        (detailsCareer.skillGaps || []).map((skill, idx) => (
                          <span key={`gap-${idx}`} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No major skill gaps detected.</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-2xl font-bold text-slate-900">Top Hiring Companies</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(detailsCareer.topCompanies || []).map((company, idx) => (
                      <span key={`company-${idx}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                        <FaBuilding className="text-xs text-slate-500" />
                        {company}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-2xl font-bold text-slate-900">Find Jobs On</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detailsCareer.jobSearch?.job_portals?.length > 0 ? (
                      detailsCareer.jobSearch.job_portals.map((portal) => (
                        <a
                          key={`portal-${portal.portal_name}`}
                          href={portal.search_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-[#d9d6ff] bg-[#f7f6ff] px-3 py-1.5 text-sm font-semibold text-[#4a43c7] transition hover:bg-[#efecff]"
                        >
                          <FaExternalLinkAlt className="text-xs" />
                          {portal.portal_name}
                        </a>
                      ))
                    ) : (
                      <a
                        href={getFallbackFindJobsUrl(detailsCareer.careerName || 'jobs')}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#d9d6ff] bg-[#f7f6ff] px-3 py-1.5 text-sm font-semibold text-[#4a43c7] transition hover:bg-[#efecff]"
                      >
                        <FaExternalLinkAlt className="text-xs" />
                        Google Jobs Search
                      </a>
                    )}
                  </div>
                </section>

                {detailsCareer.isFallbackDetails && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Showing recommendation-based details. Full catalog details are not available for this item yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CareerRecommendation;
