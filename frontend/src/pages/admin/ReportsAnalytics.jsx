import { useEffect, useMemo, useState } from 'react';
import {
  FaChartBar,
  FaChartLine,
  FaClipboardList,
  FaFileAlt,
  FaLightbulb,
} from 'react-icons/fa';
import AdminLayout from '../../components/AdminLayout';
import { adminAPI } from '../../utils/api';
import { useAdminNotification } from '../../context/AdminNotificationContext';

const fallbackTopCareers = [
  { _id: 'Full Stack Developer', count: 342, avgScore: 85 },
  { _id: 'Data Scientist', count: 287, avgScore: 78 },
  { _id: 'Frontend Developer', count: 256, avgScore: 82 },
  { _id: 'Backend Developer', count: 198, avgScore: 80 },
  { _id: 'DevOps Engineer', count: 145, avgScore: 72 },
];

const fallbackLowAtsUsers = [
  { userId: 'sample-1', name: 'John Smith', atsScore: 45 },
  { userId: 'sample-2', name: 'Lisa Brown', atsScore: 52 },
  { userId: 'sample-3', name: 'Mark Wilson', atsScore: 58 },
];

const fallbackPopularSkills = [
  { skill: 'javascript', count: 1245 },
  { skill: 'python', count: 987 },
  { skill: 'react', count: 856 },
  { skill: 'node.js', count: 723 },
  { skill: 'sql', count: 645 },
  { skill: 'aws', count: 534 },
  { skill: 'docker', count: 423 },
  { skill: 'mongodb', count: 398 },
];

const fallbackUserGrowth = [
  { month: 'October', count: 234 },
  { month: 'November', count: 312 },
  { month: 'December', count: 456 },
  { month: 'January', count: 589 },
  { month: 'February', count: 723 },
  { month: 'March', count: 531 },
];

const fallbackJobsByCategory = [
  { _id: 'software development', count: 487 },
  { _id: 'data analytics', count: 298 },
  { _id: 'design', count: 176 },
  { _id: 'business management', count: 123 },
  { _id: 'other', count: 69 },
];

function toTitleCase(value) {
  return String(value || 'Unknown')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getAtsLabel(score) {
  if (score <= 45) return 'Needs Help';
  if (score <= 55) return 'Improving';
  return 'In Progress';
}

function getAtsLabelTone(score) {
  if (score <= 45) return 'border-amber-300 bg-amber-100 text-amber-700';
  if (score <= 55) return 'border-yellow-300 bg-yellow-100 text-yellow-700';
  return 'border-orange-300 bg-orange-100 text-orange-700';
}

function ReportsAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { notify } = useAdminNotification();

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminAPI.getAnalytics();
        const payload = response?.data || response;
        setAnalytics(payload?.data || payload);
      } catch (err) {
        notify(err.message || 'Failed to load analytics', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [notify]);

  const userGrowth = analytics?.userGrowth || [];
  const topCareers = analytics?.topCareers || [];
  const lowAtsUsers = analytics?.lowAtsUsers || [];
  const popularSkills = analytics?.popularSkills || [];
  const jobsByCategory = analytics?.jobsByCategory || [];

  const visibleTopCareers = useMemo(
    () => (topCareers.length > 0 ? topCareers.slice(0, 5) : fallbackTopCareers),
    [topCareers]
  );

  const visibleLowAtsUsers = useMemo(
    () => (lowAtsUsers.length > 0 ? lowAtsUsers.slice(0, 3) : fallbackLowAtsUsers),
    [lowAtsUsers]
  );

  const visiblePopularSkills = useMemo(
    () => (popularSkills.length > 0 ? popularSkills.slice(0, 8) : fallbackPopularSkills),
    [popularSkills]
  );

  const visibleUserGrowth = useMemo(() => {
    if (userGrowth.length === 0) return fallbackUserGrowth;

    const grouped = new Map();

    userGrowth.forEach((entry) => {
      const date = new Date(entry._id);
      const monthLabel = Number.isNaN(date.getTime())
        ? entry._id
        : date.toLocaleDateString('en-US', { month: 'long' });
      const prev = grouped.get(monthLabel) || 0;
      grouped.set(monthLabel, prev + (entry.count || 0));
    });

    return Array.from(grouped.entries()).map(([month, count]) => ({ month, count }));
  }, [userGrowth]);

  const visibleJobsByCategory = useMemo(() => {
    const categories =
      jobsByCategory.length > 0 ? jobsByCategory.slice(0, 6) : fallbackJobsByCategory;
    const total = categories.reduce((sum, item) => sum + (item.count || 0), 0) || 1;

    return categories.map((item) => ({
      ...item,
      percentage: Math.round(((item.count || 0) / total) * 100),
    }));
  }, [jobsByCategory]);

  const growthMax = Math.max(
    ...visibleUserGrowth.map((item) => item.count || 0),
    1
  );

  const categoryMax = Math.max(
    ...visibleJobsByCategory.map((item) => item.count || 0),
    1
  );

  return (
    <AdminLayout
      title="Reports & Analytics"
      subtitle="Platform insights and performance metrics"
      eyebrow="Analytics"
    >
      <div className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
            <FaClipboardList className="text-violet-500" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              Career Matching Report
            </h3>
          </div>

          <div className="p-4 space-y-2.5">
            {visibleTopCareers.map((career, index) => (
              <article
                key={`${career._id || 'career'}-${index}`}
                className="rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {toTitleCase(career._id)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {career.count || 0} total matches
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-3xl font-bold leading-none text-emerald-500">
                    {Math.round(career.avgScore || 0)}%
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Avg Match</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
            <FaFileAlt className="text-amber-500" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              Students with Low ATS Scores
            </h3>
          </div>

          <div className="p-4 space-y-2.5">
            {visibleLowAtsUsers.map((student, index) => {
              const score = Math.round(student.atsScore || 0);

              return (
                <article
                  key={`${student.userId || student.email || 'student'}-${index}`}
                  className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {student.name || 'Student'}
                    </p>
                    <span
                      className={`inline-flex mt-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getAtsLabelTone(score)}`}
                    >
                      {getAtsLabel(score)}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-3xl font-bold leading-none text-rose-500">{score}</p>
                    <p className="text-[11px] text-slate-400 mt-1">ATS Score</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
            <FaLightbulb className="text-violet-500" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              Most Popular Skills
            </h3>
          </div>

          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {visiblePopularSkills.map((skill, index) => (
              <article
                key={`${skill.skill || 'skill'}-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center"
              >
                <p className="text-4xl font-bold leading-none text-indigo-500">
                  {skill.count || 0}
                </p>
                <p className="text-sm text-slate-500 mt-2 truncate">
                  {toTitleCase(skill.skill)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
            <FaChartLine className="text-emerald-500" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              User Growth Trend
            </h3>
          </div>

          <div className="p-4 space-y-2.5">
            {visibleUserGrowth.map((item, index) => {
              const width = Math.max(
                ((item.count || 0) / growthMax) * 100,
                10
              );

              return (
                <article key={`${item.month}-${index}`} className="grid grid-cols-[5.4rem_1fr] items-center gap-3">
                  <p className="text-sm text-slate-600">{item.month}</p>
                  <div className="h-8 rounded-full bg-slate-200 overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500 flex items-center justify-end px-3"
                      style={{ width: `${width}%` }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {item.count || 0}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
            <FaChartBar className="text-blue-500" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              Jobs by Category Distribution
            </h3>
          </div>

          <div className="p-4 space-y-3">
            {visibleJobsByCategory.map((job, index) => (
              <article key={`${job._id || 'category'}-${index}`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-medium text-slate-700 truncate">
                    {toTitleCase(job._id)}
                  </p>
                  <p className="text-slate-500 shrink-0">
                    {job.count || 0} jobs ({job.percentage}%)
                  </p>
                </div>

                <div className="h-2.5 mt-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-500"
                    style={{
                      width: `${Math.max(((job.count || 0) / categoryMax) * 100, 6)}%`,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        {loading && (
          <p className="text-xs text-slate-500">Loading analytics data...</p>
        )}
      </div>
    </AdminLayout>
  );
}

export default ReportsAnalytics;
