import React, { useState } from 'react';
import { FaShare, FaCopy, FaCheck, FaTimes } from 'react-icons/fa';
import { buildCareerRecommendationURL, copyToClipboard } from '../utils/urlParamBuilder';

/**
 * ShareCareerModal Component
 * 
 * Modal for sharing career recommendation links
 * Displays shareable URL and allows copying to clipboard
 * 
 * Usage:
 * <ShareCareerModal 
 *   isOpen={showShare}
 *   career={careerObject}
 *   onClose={() => setShowShare(false)}
 * />
 */
function ShareCareerModal({ isOpen, career, onClose }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  if (!isOpen || !career) return null;

  const shareUrl = buildCareerRecommendationURL({
    career: career.careerName || career.title,
    level: career.experienceLevel,
    skills: career.requiredSkills?.technical || []
  });

  const fullUrl = `${window.location.origin}${shareUrl}`;

  const handleCopyToClipboard = async () => {
    try {
      const success = await copyToClipboard(fullUrl);
      if (success) {
        setCopied(true);
        setCopyError('');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      setCopyError('Failed to copy to clipboard');
    }
  };

  const handleShare = async () => {
    // Use Web Share API if available (Chrome, Edge, Safari)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Explore Career: ${career.careerName}`,
          text: `Check out this career path: ${career.careerName}`,
          url: fullUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyToClipboard();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Close"
        >
          <FaTimes className="text-xl" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <FaShare className="text-purple-600 text-2xl" />
          <h3 className="text-2xl font-bold text-gray-900">
            Share Career: {career.careerName}
          </h3>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4">
          Share this career path with friends, mentors, or colleagues. They'll be able to see recommendations immediately upon visiting the link.
        </p>

        {/* Share Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <p className="text-xs text-gray-500 font-semibold mb-2">CAREER DETAILS</p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">Career:</span>
              <span className="ml-2 font-semibold text-gray-900">{career.careerName}</span>
            </div>
            {career.experienceLevel && (
              <div>
                <span className="text-gray-600">Level:</span>
                <span className="ml-2 font-semibold text-gray-900 capitalize">
                  {career.experienceLevel}
                </span>
              </div>
            )}
            {career.requiredSkills?.technical && career.requiredSkills.technical.length > 0 && (
              <div>
                <span className="text-gray-600">Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {career.requiredSkills.technical.slice(0, 3).map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {career.requiredSkills.technical.length > 3 && (
                    <span className="inline-block px-2 py-1 text-gray-500 text-xs font-medium">
                      +{career.requiredSkills.technical.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Share URL */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-semibold mb-2">SHAREABLE LINK</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 background-gray-50 focus:outline-none"
            />
            <button
              onClick={handleCopyToClipboard}
              className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {copied ? (
                <>
                  <FaCheck /> Copied
                </>
              ) : (
                <>
                  <FaCopy /> Copy
                </>
              )}
            </button>
          </div>
          {copyError && (
            <p className="text-red-600 text-xs mt-2">{copyError}</p>
          )}
        </div>

        {/* Share Methods */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-semibold mb-3">SHARE VIA</p>
          <div className="grid grid-cols-3 gap-2">
            {/* Copy Link Button */}
            <button
              onClick={handleCopyToClipboard}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex flex-col items-center gap-2"
              title="Copy to clipboard"
            >
              <FaCopy className="text-lg text-gray-700" />
              <span className="text-xs text-gray-700 font-medium">Copy Link</span>
            </button>

            {/* Web Share Button (if available) */}
            {navigator.share && (
              <button
                onClick={handleShare}
                className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition flex flex-col items-center gap-2"
                title="Share with system share menu"
              >
                <FaShare className="text-lg text-blue-700" />
                <span className="text-xs text-blue-700 font-medium">Share</span>
              </button>
            )}

            {/* Email Share (Optional - requires mailto setup) */}
            <a
              href={`mailto:?subject=Check out this career: ${career.careerName}&body=${fullUrl}`}
              className="p-3 bg-green-100 hover:bg-green-200 rounded-lg transition flex flex-col items-center gap-2"
              title="Share via email"
            >
              <span className="text-lg">✉️</span>
              <span className="text-xs text-green-700 font-medium">Email</span>
            </a>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <strong className="block mb-1">💡 Pro Tip:</strong>
          When someone visits this link, they'll automatically see career recommendations with relevant job portal links based on the shared criteria.
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Close
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="flex-1 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            <FaCopy /> Copy & Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareCareerModal;
