import React, { useState, useEffect } from 'react'
import { FaCloudUploadAlt, FaCheckCircle, FaLightbulb, FaSync, FaSearch, FaChevronDown, FaFileAlt, FaDownload, FaTrophy, FaChartLine, FaStar } from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { resumeAPI } from '../utils/api'

/**
 * Enhanced ATS Scanner with Weighted Scoring System
 * Features:
 * - Traditional ATS scanning
 * - Weighted scoring (50% keywords, 20% sections, 20% experience, 10% formatting)
 * - Job description matching
 * - Detailed breakdown analysis
 */
function ATSScannerEnhanced() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [scanResults, setScanResults] = useState(null)
  const [weightedResults, setWeightedResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('quick') // 'quick' or 'detailed'
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
  });

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.fullName || user.name || user.email?.split('@')[0] || 'User',
        avatar: user.avatarUrl || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'User'}`
      });
    }
  }, [user]);

  const unwrapResumePayload = (payload) => {
    if (!payload) return null;
    return payload?.data || payload;
  };

  const buildScanResults = (payload, jdText) => {
    const analysisContent = payload?.analysis || payload?.resumeContent || null;
    let parsed = null;
    if (analysisContent) {
      try {
        parsed = typeof analysisContent === 'string' ? JSON.parse(analysisContent) : analysisContent;
      } catch {
        parsed = null;
      }
    }

    const skills = parsed ? [
      ...(parsed?.skills?.technical || []),
      ...(parsed?.skills?.frameworks || []),
      ...(parsed?.skills?.languages || []),
      ...(parsed?.skills?.soft || []),
    ] : [];

    const stopWords = new Set([
      'the','and','for','with','from','this','that','have','will','your','you','are','was','were','their','they','them',
      'able','about','into','over','under','within','when','where','what','which','while','using','use','used','also',
      'role','years','year','work','working','team','teams','project','projects','skills','skill','experience','required',
      'preferred','candidate','responsibilities','ability','knowledge','hands','strong','good','excellent','must','should',
      'plus','job','position','company','degree','bachelor','master','phd'
    ]);

    const extractKeywords = (text) => {
      if (!text) return [];
      const tokens = text
        .toLowerCase()
        .match(/[a-z0-9+.#-]{3,}/g) || [];
      const unique = [];
      tokens.forEach((token) => {
        if (stopWords.has(token)) return;
        if (!unique.includes(token)) unique.push(token);
      });
      return unique;
    };

    const jobKeywords = extractKeywords(jdText);
    const normalizedSkills = skills.map((s) => s.toLowerCase());
    const matchedKeywords = jobKeywords.filter((kw) =>
      normalizedSkills.some((skill) => skill.includes(kw) || kw.includes(skill))
    );

    const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
    if (suggestions.length === 0) {
      if (!parsed?.experience?.length) suggestions.push('Add or expand your work experience section');
      if (!parsed?.projects?.length) suggestions.push('Include projects to showcase practical skills');
      if (!parsed?.education?.length) suggestions.push('Add education details to strengthen your profile');
      if (skills.length < 5) suggestions.push('List more relevant skills for your target roles');
      if (suggestions.length === 0) suggestions.push('Resume parsed successfully. Consider tailoring it to each job description.');
    }

    let score = payload?.atsScore || payload?.score || payload?.compatibility;
    if (!score) score = 50;

    return {
      compatibility: score,
      matchedCount: skills.length + matchedKeywords.length,
      suggestionsCount: suggestions.length,
      matched: skills.slice(0, 15),
      suggestions: suggestions.map((s) => ({
        icon: FaCheckCircle,
        text: s,
        detail: ''
      })),
      lastScanned: 'Just now',
      rawData: payload
    };
  };

  const pollForResumeAnalysis = async () => {
    const maxAttempts = 15;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const resumeResponse = await resumeAPI.getResume();
      const resumePayload = unwrapResumePayload(resumeResponse);
      if (!resumePayload) throw new Error('Resume not found yet');

      const status = resumePayload.analysisStatus || 'completed';
      if (status === 'completed') return resumePayload;
      if (status === 'failed') {
        throw new Error(resumePayload.analysisError || 'Resume analysis failed');
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error('Resume analysis is taking longer than expected. Please try again later.');
  };

  const handleFileDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile)
      setError('')
    }
  }

  // Quick scan (traditional ATS)
  const handleQuickScan = async () => {
    if (!file) {
      setError('Please upload a resume file first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await resumeAPI.uploadResume(file)
      const data = response?.data || response
      if (data?.status === 'processing' || data?.analysisStatus === 'processing') {
        const resumePayload = await pollForResumeAnalysis();
        setScanResults(buildScanResults(resumePayload, jobDescription))
      } else {
        setScanResults(buildScanResults(data, jobDescription))
      }
      setActiveTab('quick')
    } catch (err) {
      setError(err.message || 'Failed to scan resume. Please try again.')
      console.error('Scan error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Detailed weighted scoring
  const handleDetailedScore = async () => {
    setLoading(true)
    setError('')
    setWeightedResults(null)

    try {
      // First ensure resume is uploaded if needed
      if (file && !scanResults) {
        await handleQuickScan()
      }

      // Calculate weighted ATS score
      const response = await resumeAPI.calculateATSScore({
        jobDescription: jobDescription || undefined,
        requiredSkills: []
      })

      if (response.success && response.data) {
        setWeightedResults(response.data)
        setActiveTab('detailed')
      } else {
        throw new Error('Failed to calculate detailed score')
      }
    } catch (err) {
      setError(err.message || 'Failed to calculate detailed score. Please try again.')
      console.error('Weighted scoring error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600 bg-green-100'
    if (score >= 70) return 'text-blue-600 bg-blue-100'
    if (score >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreBarColor = (score) => {
    if (score >= 85) return 'bg-green-500'
    if (score >= 70) return 'bg-blue-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const handleDownloadReport = () => {
    const results = activeTab === 'quick' ? scanResults : weightedResults
    if (!results) return;
    
    const reportHTML = activeTab === 'quick' ? generateQuickReport(results) : generateDetailedReport(results)
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 500);
    }, 500);
  };

  const generateQuickReport = (results) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Quick ATS Analysis Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1f2937;
              padding: 40px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .score-section {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin-bottom: 30px;
              text-align: center;
            }
            .score { font-size: 64px; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎯 Quick ATS Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="score-section">
            <h2>ATS Compatibility Score</h2>
            <div class="score">${results.compatibility}%</div>
          </div>
        </body>
      </html>
    `
  }

  const generateDetailedReport = (results) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Detailed ATS Scoring Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1f2937;
              padding: 40px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .score-section {
              background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin-bottom: 30px;
              text-align: center;
            }
            .score { font-size: 64px; font-weight: bold; margin: 20px 0; }
            .breakdown {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .breakdown-item {
              background: #f3f4f6;
              padding: 20px;
              border-radius: 8px;
            }
            .skill-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-top: 15px;
            }
            .skill-tag {
              background: #dbeafe;
              color: #1e40af;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
            }

          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Detailed ATS Scoring Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="score-section">
            <h2>Weighted ATS Score</h2>
            <div class="score">${results.final_score}/100</div>
            <p style="font-size: 18px; opacity: 0.9;">Strength Level: ${results.strength_level}</p>
          </div>

          <div class="breakdown">
            <div class="breakdown-item">
              <h3>Keywords (50%)</h3>
              <p><strong>${results.keyword_score}/50</strong></p>
              <p>Match: ${results.skill_match_percentage}%</p>
            </div>
            <div class="breakdown-item">
              <h3>Sections (20%)</h3>
              <p><strong>${results.section_score}/20</strong></p>
            </div>
            <div class="breakdown-item">
              <h3>Experience (20%)</h3>
              <p><strong>${results.experience_score}/20</strong></p>
            </div>
            <div class="breakdown-item">
              <h3>Formatting (10%)</h3>
              <p><strong>${results.format_score}/10</strong></p>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; margin-bottom: 15px;">✅ Matched Skills</h2>
            <div class="skill-tags">
              ${results.matched_skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>

          <div>
            <h2 style="color: #1e40af; margin-bottom: 15px;">💡 Improvement Suggestions</h2>
            ${results.improvement_suggestions.map(s => `<p style="margin-bottom: 10px;">• ${s}</p>`).join('')}
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <p><strong>Smart Career Counselling Platform</strong></p>
            <p>Weighted ATS Scoring System</p>
          </div>
        </body>
      </html>
    `
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-52 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <FaChartLine className="text-lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Enhanced ATS Scanner</h2>
          </div>

          <Link to="/profile" className="flex items-center gap-4 border-l border-gray-200 pl-6">
            <img src={userProfile.avatar} alt={userProfile.name} className="w-9 h-9 rounded-full" />
            <span className="text-sm font-medium text-gray-900">{userProfile.name}</span>
            <FaChevronDown className="text-gray-400 text-xs" />
          </Link>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-800 hover:text-red-900">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT SECTION - Upload */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Upload Your Resume</h3>

                {/* Drag Drop Area */}
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById('file-input').click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition mb-6"
                >
                  <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <FaCloudUploadAlt className="text-3xl text-blue-600" />
                    </div>
                  </div>
                  <p className="text-gray-900 font-semibold mb-1">Drop your resume here</p>
                  <p className="text-gray-600 text-sm mb-3">or click to browse files</p>
                  <p className="text-xs text-gray-500">Supports PDF (Max 5MB)</p>

                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      setFile(e.target.files[0])
                      setError('')
                    }}
                    className="hidden"
                    id="file-input"
                  />
                </div>

                {file && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-6 flex items-center gap-2">
                    <FaFileAlt className="text-blue-600" />
                    <p className="text-sm text-blue-900 font-medium truncate">{file.name}</p>
                  </div>
                )}

                {/* Job Description */}
                <div className="mb-6">
                  <label className="text-gray-900 font-semibold text-sm mb-2 block">
                    Job Description (Optional)
                    <span className="text-gray-500 font-normal ml-1">- For better matching</span>
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here to get skill match analysis..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-sm text-gray-900 placeholder-gray-400"
                    rows="6"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Tip: Add job requirements for accurate keyword matching
                  </p>
                </div>

                {/* Scan Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleQuickScan}
                    disabled={loading || !file}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading && activeTab === 'quick' ? (
                      <>
                        <FaSync className="text-lg animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <FaSearch className="text-lg" />
                        Quick Scan
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDetailedScore}
                    disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading && activeTab === 'detailed' ? (
                      <>
                        <FaSync className="text-lg animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <FaStar className="text-lg" />
                        Detailed Score
                      </>
                    )}
                  </button>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-linear-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">🎯 Scoring Methods</h4>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li><strong>Quick Scan:</strong> Fast ATS compatibility check</li>
                    <li><strong>Detailed Score:</strong> Weighted analysis - Keywords (50%), Sections (20%), Experience (20%), Format (10%)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* RIGHT SECTION - Results */}
            <div className="lg:col-span-2">
              {(scanResults || weightedResults) ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  {/* Tab Navigation */}
                  <div className="flex gap-4 mb-6 border-b border-gray-200">
                    <button
                      onClick={() => scanResults && setActiveTab('quick')}
                      disabled={!scanResults}
                      className={`pb-3 px-4 font-semibold text-sm transition ${
                        activeTab === 'quick'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Quick Analysis
                    </button>
                    <button
                      onClick={() => weightedResults && setActiveTab('detailed')}
                      disabled={!weightedResults}
                      className={`pb-3 px-4 font-semibold text-sm transition ${
                        activeTab === 'detailed'
                          ? 'border-b-2 border-purple-600 text-purple-600'
                          : 'text-gray-500 hover:text-gray-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Detailed Scoring
                    </button>
                  </div>

                  {/* Quick Tab Content */}
                  {activeTab === 'quick' && scanResults && (
                    <div>
                      <div className="flex items-start justify-between mb-8">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-1">Quick ATS Analysis</h3>
                          <p className="text-sm text-gray-500">Last scanned: {scanResults.lastScanned}</p>
                        </div>
                      </div>

                      {/* ATS Score */}
                      <div className="mb-8">
                        <h4 className="text-gray-900 font-semibold mb-3">ATS Compatibility Score</h4>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex-1">
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getScoreBarColor(scanResults.compatibility)}`}
                                style={{ width: `${scanResults.compatibility}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className={`text-3xl font-bold ${getScoreColor(scanResults.compatibility).split(' ')[0]}`}>
                            {scanResults.compatibility}%
                          </span>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-gray-900">{scanResults.matchedCount}</p>
                          <p className="text-sm text-gray-600 mt-1">Detected Skills</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-gray-900">{scanResults.suggestionsCount}</p>
                          <p className="text-sm text-gray-600 mt-1">Suggestions</p>
                        </div>
                      </div>

                      {/* Matched Keywords */}
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <FaCheckCircle className="text-green-500" />
                          <h4 className="text-gray-900 font-bold">Detected Skills</h4>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {scanResults.matched.map((keyword, i) => (
                            <span key={i} className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Suggestions */}
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <FaLightbulb className="text-blue-600" />
                          <h4 className="text-gray-900 font-bold">Improvement Suggestions</h4>
                        </div>
                        <div className="space-y-3">
                          {scanResults.suggestions.map((suggestion, i) => (
                            <div key={i} className="bg-blue-50 rounded-lg p-4">
                              <p className="text-gray-900">{suggestion.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Tab Content */}
                  {activeTab === 'detailed' && weightedResults && (
                    <div>
                      <div className="flex items-start justify-between mb-8">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-1">Weighted ATS Scoring</h3>
                          <p className="text-sm text-gray-500">Comprehensive evaluation across 4 key areas</p>
                        </div>
                      </div>

                      {/* Final Score Card */}
                      <div className="bg-linear-to-br from-purple-600 to-blue-600 rounded-xl p-8 text-white mb-8 text-center">
                        <h4 className="text-lg font-medium mb-2 opacity-90">Your ATS Score</h4>
                        <div className="text-6xl font-bold mb-3">{weightedResults.final_score}/100</div>
                        <div className="inline-block bg-white/20 px-6 py-2 rounded-full text-sm font-semibold">
                          {weightedResults.strength_level}
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div className="mb-8">
                        <h4 className="text-gray-900 font-bold mb-4">📊 Score Breakdown</h4>
                        <div className="space-y-4">
                          {/* Keywords */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-gray-900">Keywords Matching</span>
                              <span className="text-lg font-bold text-blue-600">
                                {weightedResults.keyword_score}/50
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(weightedResults.keyword_score / 50) * 100}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              {weightedResults.matched_skills.length} skills matched
                            </p>
                          </div>

                          {/* Sections */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-gray-900">Section Completeness</span>
                              <span className="text-lg font-bold text-green-600">
                                {weightedResults.section_score}/20
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${(weightedResults.section_score / 20) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Experience */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-gray-900">Experience & Projects</span>
                              <span className="text-lg font-bold text-purple-600">
                                {weightedResults.experience_score}/20
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${(weightedResults.experience_score / 20) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Format */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-semibold text-gray-900">Formatting & Quality</span>
                              <span className="text-lg font-bold text-orange-600">
                                {weightedResults.format_score}/10
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${(weightedResults.format_score / 10) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Matched Skills */}
                      {weightedResults.matched_skills.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-4">
                            <FaCheckCircle className="text-green-500" />
                            <h4 className="text-gray-900 font-bold">✅ Matched Skills</h4>
                            <span className="text-sm text-gray-500">({weightedResults.matched_skills.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {weightedResults.matched_skills.map((skill, i) => (
                              <span key={i} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Improvement Suggestions */}
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <FaLightbulb className="text-blue-600" />
                          <h4 className="text-gray-900 font-bold">💡 Improvement Suggestions</h4>
                        </div>
                        <div className="space-y-3">
                          {weightedResults.improvement_suggestions.map((suggestion, i) => (
                            <div key={i} className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                              <p className="text-gray-900">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleDownloadReport}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <FaDownload className="text-lg" />
                      Download Report
                    </button>
                    <button
                      onClick={() => navigate('/career-recommendation')}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <FaTrophy className="text-lg" />
                      Career Recommendations
                    </button>
                    <button
                      onClick={() => {
                        setScanResults(null)
                        setWeightedResults(null)
                        setFile(null)
                        setJobDescription('')
                        setActiveTab('quick')
                      }}
                      className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <FaSync className="text-lg" />
                      New Scan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <FaChartLine className="text-5xl text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Analyze Your Resume?</h3>
                  <p className="text-gray-600 mb-6">
                    Upload your resume and choose between Quick Scan or Detailed Scoring to get started
                  </p>
                  <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-lg p-6 max-w-md mx-auto">
                    <h4 className="font-semibold text-gray-900 mb-3">What you'll get:</h4>
                    <ul className="text-sm text-gray-700 space-y-2 text-left">
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-green-500 mt-0.5 shrink-0" />
                        <span>Comprehensive ATS compatibility analysis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-green-500 mt-0.5 shrink-0" />
                        <span>Weighted scoring across 4 key criteria</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-green-500 mt-0.5 shrink-0" />
                        <span>Personalized improvement suggestions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <FaCheckCircle className="text-green-500 mt-0.5 shrink-0" />
                        <span>Downloadable detailed report</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ATSScannerEnhanced
