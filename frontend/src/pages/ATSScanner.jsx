import React, { useState, useEffect } from 'react'
import { FaCloudUploadAlt, FaCheckCircle, FaLightbulb, FaSync, FaSearch, FaFileAlt, FaDownload, FaTrophy, FaHistory, FaTrash, FaClock, FaChartBar, FaEye } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import StudentProfileDropdown from '../components/StudentProfileDropdown'
import { resumeAPI } from '../utils/api'

function ATSScanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [scanResults, setScanResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userProfile, setUserProfile] = useState({
    name: 'User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
  });
  
  // Scan History State
  const [scanHistory, setScanHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedHistoryScan, setSelectedHistoryScan] = useState(null)
  const [showHistory, setShowHistory] = useState(true)

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.fullName || user.name || user.email?.split('@')[0] || 'User',
        avatar: user.avatarUrl || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || 'User'}`
      });
      loadScanHistory();
    }
  }, [user]);

  // Load Scan History
  const loadScanHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await resumeAPI.getScanHistory(1, 10);
      const scans = response?.data?.scans || response?.scans || [];
      setScanHistory(scans);
    } catch (err) {
      console.error('Failed to load scan history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Delete Single Scan
  const handleDeleteScan = async (scanId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scan?')) return;
    
    try {
      await resumeAPI.deleteScan(scanId);
      setScanHistory(prev => prev.filter(scan => scan._id !== scanId));
      if (selectedHistoryScan?._id === scanId) {
        setSelectedHistoryScan(null);
      }
    } catch (err) {
      setError('Failed to delete scan');
    }
  };

  // View History Scan Details
  const handleViewHistoryScan = (scan) => {
    setSelectedHistoryScan(scan);
    setShowHistory(false);
  };

  // Back to History List
  const handleBackToHistory = () => {
    setSelectedHistoryScan(null);
    setShowHistory(true);
  };

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
    const missingKeywords = jobKeywords.filter((kw) =>
      !normalizedSkills.some((skill) => skill.includes(kw) || kw.includes(skill))
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
      resumeType: payload?.resume_type || 'Unknown',
      resumeTypeConfidence: payload?.resume_type_confidence || 0,
      resumeTypeIndicators: payload?.resume_type_indicators || { technical: [], nonTechnical: [] },
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

  const handleScan = async () => {
    if (!file) {
      setError('Please upload a resume file first')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await resumeAPI.uploadResume(file)
      const data = response?.data || response
      let scanResult;
      
      if (data?.status === 'processing' || data?.analysisStatus === 'processing') {
        const resumePayload = await pollForResumeAnalysis();
        scanResult = buildScanResults(resumePayload, jobDescription)
        setScanResults(scanResult)
      } else {
        scanResult = buildScanResults(data, jobDescription)
        setScanResults(scanResult)
      }
      
      // Save quick scan to history manually
      try {
        await resumeAPI.saveScanToHistory({
          scanType: 'quick',
          resumeUrl: data?.resumeUrl || data?.data?.resumeUrl,
          quickScanResults: {
            compatibility: scanResult.compatibility,
            matchedCount: scanResult.matchedCount,
            suggestionsCount: scanResult.suggestionsCount,
            matched: scanResult.matched,
            suggestions: scanResult.suggestions.map(s => s.text)
          },
          jobDescription: jobDescription || ''
        });
      } catch (saveErr) {
        console.error('Failed to save scan to history:', saveErr);
      }
      
      // Reload scan history after successful scan
      await loadScanHistory();
    } catch (err) {
      setError(err.message || 'Failed to scan resume. Please try again.')
      console.error('Scan error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = () => {
    if (!scanResults) return;
    
    // Create a professional HTML report
    const reportHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>ATS Analysis Report</title>
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
            .header h1 {
              font-size: 32px;
              color: #1e40af;
              margin-bottom: 10px;
            }
            .header p {
              color: #6b7280;
              font-size: 14px;
            }
            .score-section {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              margin-bottom: 30px;
              text-align: center;
            }
            .score-section h2 {
              font-size: 24px;
              margin-bottom: 15px;
            }
            .score {
              font-size: 64px;
              font-weight: bold;
              margin: 20px 0;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .stat-card {
              background: #f3f4f6;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
            }
            .stat-card h3 {
              font-size: 36px;
              color: #2563eb;
              margin-bottom: 5px;
            }
            .stat-card p {
              color: #6b7280;
              font-size: 14px;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section h2 {
              font-size: 20px;
              color: #1e40af;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            .skill-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }
            .skill-tag {
              background: #dbeafe;
              color: #1e40af;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 500;
            }
            .skill-tag.missing {
              background: #fed7aa;
              color: #c2410c;
            }
            .suggestion {
              background: #eff6ff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 10px;
              border-left: 4px solid #2563eb;
            }
            .suggestion p {
              font-size: 14px;
              color: #1f2937;
            }
            .footer {
              text-align: center;
              padding-top: 30px;
              margin-top: 30px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
              .score-section { background: #10b981 !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎯 ATS Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <div class="score-section">
            <h2>ATS Compatibility Score</h2>
            <div class="score">${scanResults.compatibility}%</div>
            <p style="font-size: 18px; opacity: 0.9;">Your resume is ${scanResults.compatibility >= 80 ? 'Excellent' : scanResults.compatibility >= 60 ? 'Good' : 'Needs Improvement'} for ATS systems</p>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <h3>${scanResults.matchedCount}</h3>
              <p>Detected Skills</p>
            </div>
            <div class="stat-card">
              <h3>${scanResults.suggestionsCount}</h3>
              <p>Suggestions</p>
            </div>
          </div>

          <div class="section">
            <h2>✅ Detected Skills</h2>
            <div class="skill-tags">
              ${scanResults.matched.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>

          <div class="section">
            <h2>💡 Improvement Suggestions</h2>
            ${scanResults.suggestions.map(s => `
              <div class="suggestion">
                <p><strong>•</strong> ${s.text}</p>
              </div>
            `).join('')}
          </div>

          <div class="footer">
            <p><strong>Smart Career Counselling Platform</strong></p>
            <p>This report was generated automatically by our ATS analysis system</p>
          </div>
        </body>
      </html>
    `;

    // Create a new window and print to PDF
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 500);
    }, 500);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 ml-52 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <FaSearch className="text-lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">ATS Scanner</h2>
          </div>

          <StudentProfileDropdown
            name={userProfile.name}
            email={user?.email || 'student@demo.com'}
            avatar={userProfile.avatar}
            className="border-l border-gray-200 pl-6"
          />
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-lg">
              {error}
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
                  <label className="text-gray-900 font-semibold text-sm mb-2 block">Job Description (Optional)</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description to get more accurate matching..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-sm text-gray-900 placeholder-gray-400"
                    rows="6"
                  />
                </div>

                {/* Scan Button */}
                <button
                  onClick={handleScan}
                  disabled={loading || !file}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <FaSync className="text-lg animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <FaSearch className="text-lg" />
                      Scan Resume
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT SECTION - Results */}
            <div className="lg:col-span-2">
              {scanResults ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">ATS Analysis Results</h3>
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
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${scanResults.compatibility}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-3xl font-bold text-green-500">{scanResults.compatibility}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Poor</span>
                      <span>Good</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  {/* Resume Type Detection */}
                  {scanResults.resumeType && scanResults.resumeType !== 'Unknown' && (
                    <div className="mb-8 p-4 rounded-lg border-2 border-purple-200 bg-purple-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 font-medium uppercase tracking-wide">Resume Type Detected</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-lg font-bold ${
                              scanResults.resumeType === 'Technical' ? 'text-blue-700' :
                              scanResults.resumeType === 'Non-Technical' ? 'text-orange-700' :
                              'text-purple-700'
                            }`}>
                              {scanResults.resumeType}
                            </span>
                            <span className="text-xs bg-white px-2 py-1 rounded text-gray-600">
                              {scanResults.resumeTypeConfidence}% confidence
                            </span>
                          </div>
                        </div>
                        <div className={`text-4xl font-bold opacity-20 ${
                          scanResults.resumeType === 'Technical' ? 'text-blue-500' :
                          scanResults.resumeType === 'Non-Technical' ? 'text-orange-500' :
                          'text-purple-500'
                        }`}>
                          {scanResults.resumeType === 'Technical' ? '⚙️' :
                           scanResults.resumeType === 'Non-Technical' ? '📊' :
                           '🔄'}
                        </div>
                      </div>
                    </div>
                  )}

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
                      {scanResults.suggestions.map((suggestion, i) => {
                        const Icon = suggestion.icon
                        return (
                          <div key={i} className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Icon className="text-blue-600 mt-1 shrink-0" />
                              <div>
                                <p className="text-gray-900 font-semibold">{suggestion.text}</p>
                                <p className="text-sm text-gray-600 mt-1">{suggestion.detail}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
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
                      title="Generate career recommendations based on your ATS score"
                    >
                      <FaTrophy className="text-lg" />
                      Career Recommendation
                    </button>
                    <button
                      onClick={() => {
                        setScanResults(null)
                        setFile(null)
                        setJobDescription('')
                      }}
                      className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <FaSync className="text-lg" />
                      New Scan
                    </button>
                  </div>
                </div>
              ) : (
                // Scan History Section
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  {/* History Header */}
                  <div className="border-b border-gray-200 px-8 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <FaHistory className="text-purple-600 text-xl" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Scan History</h3>
                          <p className="text-sm text-gray-500">
                            {scanHistory.length} {scanHistory.length === 1 ? 'scan' : 'scans'} found
                          </p>
                        </div>
                      </div>
                      {selectedHistoryScan && (
                        <button
                          onClick={handleBackToHistory}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                          <FaHistory className="text-sm" />
                          Back to List
                        </button>
                      )}
                    </div>
                  </div>

                  {/* History Content */}
                  <div className="p-8">
                    {historyLoading ? (
                      <div className="text-center py-12">
                        <FaSync className="text-4xl text-gray-400 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Loading scan history...</p>
                      </div>
                    ) : selectedHistoryScan ? (
                      // Selected Scan Details View
                      <div>
                        {/* Scan Info Banner */}
                        <div className="bg-linear-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  selectedHistoryScan.scanType === 'detailed' 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {selectedHistoryScan.scanType?.toUpperCase() || 'QUICK'} SCAN
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                  <FaClock className="text-xs" />
                                  {new Date(selectedHistoryScan.scannedAt).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <h4 className="text-lg font-bold text-gray-900">
                                Resume Analysis Report
                              </h4>
                            </div>
                            <button
                              onClick={(e) => handleDeleteScan(selectedHistoryScan._id, e)}
                              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition flex items-center gap-2"
                            >
                              <FaTrash className="text-sm" />
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Score Display */}
                        {(() => {
                          // Get score based on scan type
                          const score = selectedHistoryScan.scanType === 'detailed' 
                            ? selectedHistoryScan.detailedResults?.overallScore 
                            : selectedHistoryScan.quickScanResults?.compatibility;
                          
                          if (!score && score !== 0) return null;
                          
                          return (
                            <div className="mb-6">
                              <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                                <div className="text-center">
                                  <p className="text-sm text-gray-600 mb-2">
                                    {selectedHistoryScan.scanType === 'detailed' ? 'Overall ATS Score' : 'ATS Compatibility Score'}
                                  </p>
                                  <div className="flex items-center justify-center gap-4 mb-4">
                                    <div className="text-5xl font-bold text-green-600">
                                      {Math.round(score)}%
                                    </div>
                                    <div className="text-left">
                                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        score >= 80 
                                          ? 'bg-green-100 text-green-700'
                                          : score >= 60
                                          ? 'bg-blue-100 text-blue-700'
                                          : score >= 40
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'
                                      }`}>
                                        {score >= 80 ? 'EXCELLENT' :
                                         score >= 60 ? 'GOOD' :
                                         score >= 40 ? 'FAIR' : 'NEEDS WORK'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-linear-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Component Scores Grid */}
                        {selectedHistoryScan.detailedResults?.components && (
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            {Object.entries(selectedHistoryScan.detailedResults.components).map(([key, data]) => (
                              <div key={key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-semibold text-gray-700 capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                  <span className="text-lg font-bold text-gray-900">
                                    {Math.round(data.score || 0)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      key === 'keywords' ? 'bg-blue-500' :
                                      key === 'sections' ? 'bg-purple-500' :
                                      key === 'experience' ? 'bg-green-500' :
                                      'bg-orange-500'
                                    }`}
                                    style={{ width: `${data.score || 0}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Weight: {data.weight}%
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Matched Keywords/Skills - Detailed Scans */}
                        {selectedHistoryScan.scanType === 'detailed' && selectedHistoryScan.detailedResults?.components?.keywords?.matchedKeywords?.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                              <FaCheckCircle className="text-green-500" />
                              Matched Keywords ({selectedHistoryScan.detailedResults.components.keywords.matchedKeywords.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedHistoryScan.detailedResults.components.keywords.matchedKeywords.slice(0, 20).map((keyword, idx) => (
                                <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  {keyword}
                                </span>
                              ))}
                              {selectedHistoryScan.detailedResults.components.keywords.matchedKeywords.length > 20 && (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                  +{selectedHistoryScan.detailedResults.components.keywords.matchedKeywords.length - 20} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Detected Skills - Quick Scans */}
                        {selectedHistoryScan.scanType === 'quick' && selectedHistoryScan.quickScanResults?.matched?.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                              <FaCheckCircle className="text-green-500" />
                              Detected Skills ({selectedHistoryScan.quickScanResults.matched.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedHistoryScan.quickScanResults.matched.map((skill, idx) => (
                                <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggestions - Quick Scans */}
                        {selectedHistoryScan.scanType === 'quick' && selectedHistoryScan.quickScanResults?.suggestions?.length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                              <FaLightbulb className="text-blue-600" />
                              Improvement Suggestions ({selectedHistoryScan.quickScanResults.suggestions.length})
                            </h4>
                            <div className="space-y-2">
                              {selectedHistoryScan.quickScanResults.suggestions.map((suggestion, idx) => (
                                <div key={idx} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <p className="text-sm text-gray-700">• {suggestion}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Stats Grid - Quick Scans */}
                        {selectedHistoryScan.scanType === 'quick' && (
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                              <p className="text-2xl font-bold text-gray-900">{selectedHistoryScan.quickScanResults?.matchedCount || 0}</p>
                              <p className="text-sm text-gray-600 mt-1">Detected Skills</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                              <p className="text-2xl font-bold text-gray-900">{selectedHistoryScan.quickScanResults?.suggestionsCount || 0}</p>
                              <p className="text-sm text-gray-600 mt-1">Suggestions</p>
                            </div>
                          </div>
                        )}

                        {/* Job Description */}
                        {selectedHistoryScan.jobDescription && (
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="text-sm font-bold text-gray-900 mb-2">Job Description Used</h4>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                              {selectedHistoryScan.jobDescription}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : scanHistory.length > 0 ? (
                      // History List View
                      <div className="grid grid-cols-1 gap-4 max-h-150 overflow-y-auto pr-2">
                        {scanHistory.map((scan) => {
                          // Get score from either detailed or quick scan results
                          let score = 0;
                          if (scan.scanType === 'detailed') {
                            score = scan.detailedResults?.overallScore || 0;
                          } else {
                            score = scan.quickScanResults?.compatibility || 0;
                          }
                          const scanDate = new Date(scan.scannedAt);
                          const isDetailed = scan.scanType === 'detailed';
                          
                          return (
                            <div
                              key={scan._id}
                              className="bg-gray-50 hover:bg-gray-100 rounded-lg p-5 border border-gray-200 cursor-pointer transition group"
                              onClick={() => handleViewHistoryScan(scan)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {/* Header */}
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      isDetailed 
                                        ? 'bg-purple-100 text-purple-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {isDetailed ? 'DETAILED' : 'QUICK'}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      score >= 80 ? 'bg-green-100 text-green-700' :
                                      score >= 60 ? 'bg-blue-100 text-blue-700' :
                                      score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {Math.round(score)}% SCORE
                                    </span>
                                  </div>

                                  {/* Score Bar */}
                                  <div className="mb-3">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          score >= 80 ? 'bg-green-500' :
                                          score >= 60 ? 'bg-blue-500' :
                                          score >= 40 ? 'bg-yellow-500' :
                                          'bg-red-500'
                                        }`}
                                        style={{ width: `${score}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Meta Info */}
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <FaClock />
                                      {scanDate.toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    {isDetailed && scan.detailedResults?.components && (
                                      <span className="flex items-center gap-1">
                                        <FaChartBar />
                                        {Object.keys(scan.detailedResults.components).length} Components
                                      </span>
                                    )}
                                    {scan.jobDescription && (
                                      <span className="flex items-center gap-1">
                                        <FaFileAlt />
                                        With Job Description
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 ml-4">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewHistoryScan(scan);
                                    }}
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 opacity-0 group-hover:opacity-100"
                                  >
                                    <FaEye />
                                    View
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteScan(scan._id, e)}
                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition opacity-0 group-hover:opacity-100"
                                    title="Delete scan"
                                  >
                                    <FaTrash className="text-sm" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      // Empty State
                      <div className="text-center py-12">
                        <div className="flex justify-center mb-6">
                          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                            <FaFileAlt className="text-5xl text-gray-400" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No Scans Yet</h3>
                        <p className="text-gray-600 mb-6">Upload your resume on the left to get started with ATS analysis</p>
                      </div>
                    )}
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

export default ATSScanner
