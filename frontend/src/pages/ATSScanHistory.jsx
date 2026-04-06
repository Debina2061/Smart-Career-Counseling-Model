import React, { useState, useEffect } from 'react'
import { FaHistory, FaChevronDown, FaEye, FaTrash, FaCalendar, FaFileAlt, FaTrophy, FaChartLine, FaArrowLeft, FaCheckCircle } from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { resumeAPI } from '../utils/api'

/**
 * ATS Scan History Component
 * Displays all previous ATS scans with ability to view details
 */
function ATSScanHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [scanHistory, setScanHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedScan, setSelectedScan] = useState(null)
  const [viewingDetails, setViewingDetails] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
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
    loadScanHistory();
  }, [user]);

  const loadScanHistory = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await resumeAPI.getScanHistory()
      if (response.success && response.data) {
        setScanHistory(response.data.scans)
      }
    } catch (err) {
      setError(err.message || 'Failed to load scan history')
      console.error('Load history error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (scanId) => {
    try {
      const response = await resumeAPI.getScanById(scanId)
      if (response.success && response.data) {
        setSelectedScan(response.data)
        setViewingDetails(true)
      }
    } catch (err) {
      setError(err.message || 'Failed to load scan details')
      console.error('Load scan error:', err)
    }
  }

  const handleDelete = async (scanId) => {
    if (!window.confirm('Are you sure you want to delete this scan?')) {
      return
    }

    setDeletingId(scanId)
    try {
      await resumeAPI.deleteScan(scanId)
      setScanHistory(scanHistory.filter(scan => scan.id !== scanId))
      if (selectedScan?._id === scanId) {
        setSelectedScan(null)
        setViewingDetails(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to delete scan')
      console.error('Delete error:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all scan history? This cannot be undone.')) {
      return
    }

    try {
      await resumeAPI.clearScanHistory()
      setScanHistory([])
      setSelectedScan(null)
      setViewingDetails(false)
    } catch (err) {
      setError(err.message || 'Failed to clear history')
      console.error('Clear history error:', err)
    }
  }

  const getScoreBadgeColor = (score) => {
    if (score >= 85) return 'bg-green-100 text-green-700'
    if (score >= 70) return 'bg-blue-100 text-blue-700'
    if (score >= 50) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 ml-52 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
              <FaHistory className="text-lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">ATS Scan History</h2>
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

          {viewingDetails && selectedScan ? (
            // DETAIL VIEW
            <div>
              <button
                onClick={() => setViewingDetails(false)}
                className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <FaArrowLeft />
                <span>Back to History</span>
              </button>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedScan.resumeName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      <FaCalendar className="inline mr-2" />
                      Scanned on {formatDate(selectedScan.scannedAt)}
                    </p>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getScoreBadgeColor(
                    selectedScan.scanType === 'detailed' 
                      ? selectedScan.detailedResults?.final_score 
                      : selectedScan.quickScanResults?.compatibility
                  )}`}>
                    {selectedScan.scanType === 'detailed' 
                      ? `${selectedScan.detailedResults?.final_score}/100` 
                      : `${selectedScan.quickScanResults?.compatibility}%`}
                  </span>
                </div>

                {/* Detailed Results */}
                {selectedScan.scanType === 'detailed' && selectedScan.detailedResults && (
                  <div>
                    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white mb-6 text-center">
                      <h4 className="text-lg font-medium mb-2 opacity-90">ATS Score</h4>
                      <div className="text-5xl font-bold mb-2">
                        {selectedScan.detailedResults.final_score}/100
                      </div>
                      <div className="inline-block bg-white/20 px-4 py-1 rounded-full text-sm font-semibold">
                        {selectedScan.detailedResults.strength_level}
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-4">📊 Score Breakdown</h4>
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-900">Keywords (50%)</span>
                            <span className="text-lg font-bold text-blue-600">
                              {selectedScan.detailedResults.keyword_score}/50
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(selectedScan.detailedResults.keyword_score / 50) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-900">Sections (20%)</span>
                            <span className="text-lg font-bold text-green-600">
                              {selectedScan.detailedResults.section_score}/20
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(selectedScan.detailedResults.section_score / 20) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-900">Experience (20%)</span>
                            <span className="text-lg font-bold text-purple-600">
                              {selectedScan.detailedResults.experience_score}/20
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${(selectedScan.detailedResults.experience_score / 20) * 100}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-900">Formatting (10%)</span>
                            <span className="text-lg font-bold text-orange-600">
                              {selectedScan.detailedResults.format_score}/10
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${(selectedScan.detailedResults.format_score / 10) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Matched Skills */}
                    {selectedScan.detailedResults.matched_skills?.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <FaCheckCircle className="text-green-500" />
                          <h4 className="font-bold text-gray-900">Matched Skills</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedScan.detailedResults.matched_skills.map((skill, i) => (
                            <span key={i} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvement Suggestions */}
                    {selectedScan.detailedResults.improvement_suggestions?.length > 0 && (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3">💡 Improvement Suggestions</h4>
                        <div className="space-y-2">
                          {selectedScan.detailedResults.improvement_suggestions.map((suggestion, i) => (
                            <div key={i} className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                              <p className="text-gray-900 text-sm">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Scan Results */}
                {selectedScan.scanType === 'quick' && selectedScan.quickScanResults && (
                  <div>
                    <div className="bg-green-100 rounded-lg p-6 mb-6 text-center">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Compatibility Score</h4>
                      <div className="text-5xl font-bold text-green-600">
                        {selectedScan.quickScanResults.compatibility}%
                      </div>
                    </div>

                    {selectedScan.quickScanResults.matched?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-3">✅ Detected Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedScan.quickScanResults.matched.map((skill, i) => (
                            <span key={i} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedScan.quickScanResults.suggestions?.length > 0 && (
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3">💡 Suggestions</h4>
                        <div className="space-y-2">
                          {selectedScan.quickScanResults.suggestions.map((suggestion, i) => (
                            <div key={i} className="bg-blue-50 rounded-lg p-3">
                              <p className="text-gray-900 text-sm">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => handleDelete(selectedScan._id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <FaTrash />
                    Delete Scan
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // LIST VIEW
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Your ATS Scan History</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {scanHistory.length} scan{scanHistory.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="flex gap-3">
                  {scanHistory.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/ats-enhanced')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold"
                  >
                    New Scan
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading scan history...</p>
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                      <FaHistory className="text-5xl text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Scans Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Start scanning your resume to see your history here
                  </p>
                  <button
                    onClick={() => navigate('/ats-enhanced')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-semibold"
                  >
                    Scan Your Resume
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {scanHistory.map((scan) => (
                    <div
                      key={scan.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FaFileAlt className="text-gray-400" />
                            <h4 className="font-semibold text-gray-900 truncate">
                              {scan.resumeName}
                            </h4>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDate(scan.scannedAt)}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getScoreBadgeColor(scan.score)}`}>
                          {scan.score}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          scan.scanType === 'detailed' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {scan.scanType === 'detailed' ? 'Detailed' : 'Quick'} Scan
                        </span>
                        {scan.hasJobDescription && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">
                            With Job Description
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <FaTrophy className="text-yellow-500" />
                          <span className="font-semibold">{scan.strengthLevel}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <FaChartLine className="text-blue-500" />
                          <span>{scan.matchedSkillsCount} skills matched</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(scan.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition text-sm font-semibold flex items-center justify-center gap-2"
                        >
                          <FaEye />
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(scan.id)}
                          disabled={deletingId === scan.id}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold disabled:opacity-50"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default ATSScanHistory
