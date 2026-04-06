import React, { useState, useEffect } from 'react'
import { FaBrain, FaChevronDown, FaTrophy, FaStar, FaExclamationTriangle, FaLightbulb, FaBook, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { resumeAPI, careerAPI } from '../utils/api'

function SkillAnalysis() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
  });
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState([
    { icon: FaTrophy, label: 'ATS Score', value: '--', color: 'text-green-600' },
    { icon: FaStar, label: 'Your Skills', value: '--', color: 'text-blue-600' },
    { icon: FaExclamationTriangle, label: 'Skill Gaps', value: '--', color: 'text-orange-600' },
    { icon: FaBook, label: 'Career Matches', value: '--', color: 'text-purple-600' },
  ]);

  const [allSkills, setAllSkills] = useState([]);
  const [skillGaps, setSkillGaps] = useState([]);
  const [topCareerName, setTopCareerName] = useState('');
  const [skillCompare, setSkillCompare] = useState({
    existing: [],
    missing: []
  });

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.fullName || user.name || user.email?.split('@')[0] || 'User',
        avatar: user.avatarUrl || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'User'}`
      });
    }
    loadUserSkills();
  }, [user]);

  const loadUserSkills = async () => {
    try {
      setLoading(true);
      const [resumeRes, recRes] = await Promise.allSettled([
        resumeAPI.getResume(),
        careerAPI.getRecommendations(),
      ]);

      const resume = resumeRes.status === 'fulfilled' ? resumeRes.value?.data : null;
      let skills = [];
      const atsScore = typeof resume?.atsScore === 'number' ? resume.atsScore : null;
      
      if (resume?.resumeContent) {
        try {
          const parsed = typeof resume.resumeContent === 'string'
            ? JSON.parse(resume.resumeContent)
            : resume.resumeContent;
          skills = [
            ...(parsed?.skills?.technical || []),
            ...(parsed?.skills?.frameworks || []),
            ...(parsed?.skills?.languages || []),
            ...(parsed?.skills?.soft || []),
          ];
        } catch {
          skills = [];
        }
      }

      setAllSkills(skills);

      const recommendationDoc = recRes.status === 'fulfilled' ? (recRes.value?.data || recRes.value) : null;
      const recommendations = recommendationDoc?.recommendations || [];
      const firstRec = recommendations[0] || null;
      const gaps = firstRec?.skillGaps || [];
      
      setSkillGaps(gaps);
      setTopCareerName(firstRec?.careerName || firstRec?.name || 'your top career match');

      let requiredSkills = [];
      if (firstRec?.careerId) {
        try {
          const detailRes = await careerAPI.getCareerDetails(firstRec.careerId);
          const detail = detailRes?.data || detailRes;
          const requiredTech = detail?.requiredSkills?.technical || [];
          const requiredSoft = detail?.requiredSkills?.soft || [];
          requiredSkills = [...requiredTech, ...requiredSoft].filter(Boolean);
        } catch {
          requiredSkills = [];
        }
      }

      const userSkillsNormalized = new Set(
        skills
          .filter((skill) => typeof skill === 'string')
          .map((skill) => skill.trim().toLowerCase())
          .filter(Boolean)
      );

      const requiredNormalized = requiredSkills
        .filter((skill) => typeof skill === 'string')
        .map((skill) => skill.trim());

      const existing = requiredNormalized.filter(
        (skill) => userSkillsNormalized.has(skill.toLowerCase())
      );
      const missing = requiredNormalized.filter(
        (skill) => !userSkillsNormalized.has(skill.toLowerCase())
      );

      setSkillCompare({
        existing: existing.slice(0, 12),
        missing: missing.slice(0, 12)
      });

      const overallScore = typeof atsScore === 'number' ? `${atsScore}%` : '--';
      const skillCount = skills.length;
      const gapCount = gaps.length;

      setStats([
        { icon: FaTrophy, label: 'ATS Score', value: overallScore, color: 'text-green-600' },
        { icon: FaStar, label: 'Your Skills', value: skillCount.toString(), color: 'text-blue-600' },
        { icon: FaExclamationTriangle, label: 'Skill Gaps', value: gapCount.toString(), color: 'text-orange-600' },
        { icon: FaBook, label: 'Career Matches', value: recommendations.length.toString(), color: 'text-purple-600' },
      ]);
    } catch (error) {
      console.log('Using default skills data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-52 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
              <FaBrain className="text-lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Skill Analysis</h2>
          </div>

          <Link to="/profile" className="flex items-center gap-4 border-l border-gray-200 pl-6">
            <img src={userProfile.avatar} alt={userProfile.name} className="w-9 h-9 rounded-full" />
            <span className="text-sm font-medium text-gray-900">{userProfile.name}</span>
            <FaChevronDown className="text-gray-400 text-xs" />
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Skill Analysis</h2>
            <p className="text-gray-600">Overview based on your resume and career recommendations</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Icon className={`text-3xl ${stat.color}`} />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Your Skills Overview</h3>
              <p className="text-sm text-gray-600 mt-1">All skills extracted from your resume</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {allSkills.length === 0 && (
                <p className="text-sm text-gray-500">No skills found. Upload your resume to see your skills.</p>
              )}
              {allSkills.map((skill, idx) => (
                <span key={`skill-${idx}`} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Career Match Analysis</h3>
              <p className="text-sm text-gray-600 mt-1">
                Skills comparison with <span className="font-semibold text-blue-600">{topCareerName}</span>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FaCheckCircle className="text-green-600 text-xl" />
                  <h4 className="text-lg font-semibold text-gray-900">Skills You Have</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skillCompare.existing.length === 0 && (
                    <p className="text-sm text-gray-500">No matching skills found. Generate career recommendations first.</p>
                  )}
                  {skillCompare.existing.map((skill, idx) => (
                    <span key={`exist-${idx}`} className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FaTimesCircle className="text-red-600 text-xl" />
                  <h4 className="text-lg font-semibold text-gray-900">Skills to Learn</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skillCompare.missing.length === 0 && (
                    <p className="text-sm text-gray-500">No skill gaps detected. Great job!</p>
                  )}
                  {skillCompare.missing.map((skill, idx) => (
                    <span key={`miss-${idx}`} className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Priority Skills to Learn</h3>
              <p className="text-sm text-gray-600 mt-1">Focus on these skills to match your top career path</p>
            </div>
            <div className="space-y-3">
              {skillGaps.length === 0 && (
                <div className="text-center py-8">
                  <FaLightbulb className="text-4xl text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No skill gaps identified yet.</p>
                  <Link to="/career-recommendation" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                    Generate career recommendations to see skill gaps
                  </Link>
                </div>
              )}
              {skillGaps.map((gap, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-linear-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{gap}</p>
                      <p className="text-xs text-gray-600">Required for {topCareerName}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                    High Priority
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default SkillAnalysis
