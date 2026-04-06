/**
 * URL Parameter Builder - Create shareable links with career recommendation search parameters
 */

/**
 * Build a career recommendation URL with parameters
 * @param {Object} params - Search parameters
 * @param {string} params.career - Career name (e.g., "full-stack-developer")
 * @param {string} params.level - Experience level (entry, junior, mid, senior)
 * @param {Array<string>} params.skills - Required skills (e.g., ["react", "nodejs"])
 * @param {string} params.location - Preferred location
 * @returns {string} - Complete URL with parameters
 */
export const buildCareerRecommendationURL = (params = {}) => {
  const baseURL = `${window.location.origin}/career-recommendation`;
  const searchParams = new URLSearchParams();

  if (params.career) {
    searchParams.append('career', params.career.toLowerCase().replace(/\s+/g, '-'));
  }
  if (params.level) {
    searchParams.append('level', params.level.toLowerCase());
  }
  if (params.skills && Array.isArray(params.skills)) {
    searchParams.append('skills', params.skills.map(s => s.toLowerCase().trim()).join(','));
  }
  if (params.location) {
    searchParams.append('location', params.location);
  }

  return `${baseURL}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
};

/**
 * Generate a shareable link for a specific career
 * @param {Object} career - Career object with careerName, experienceLevel, location
 * @returns {string} - Shareable URL
 */
export const generateShareableCareerLink = (career) => {
  return buildCareerRecommendationURL({
    career: career?.careerName || career?.name,
    level: career?.experienceLevel,
    location: career?.location
  });
};

/**
 * Create job search links with enhanced parameters
 * @param {string} baseSearchUrl - Base job portal search URL
 * @param {Object} params - Search parameters
 * @returns {string} - Enhanced job search URL with parameters
 */
export const enhanceJobSearchURL = (baseSearchUrl, params = {}) => {
  if (!baseSearchUrl) return '';

  const { career, skills, level, location } = params;
  let query = career || '';

  // Add skills to search query
  if (skills && Array.isArray(skills) && skills.length > 0) {
    const skillStr = skills.join('+');
    query = query ? `${query}+${skillStr}` : skillStr;
  }

  // Add level indicator
  if (level) {
    query = query ? `${query}+${level}` : level;
  }

  // Build URL
  let enhancedURL = baseSearchUrl;
  
  if (query) {
    const separator = baseSearchUrl.includes('?') ? '&' : '?';
    // Handle different portal formats
    if (baseSearchUrl.includes('merojob')) {
      enhancedURL = `${baseSearchUrl}${separator}q=${encodeURIComponent(query)}`;
    } else if (baseSearchUrl.includes('kumarijob')) {
      enhancedURL = `${baseSearchUrl}${separator}keyword=${encodeURIComponent(query)}`;
    } else {
      enhancedURL = `${baseSearchUrl}${separator}search=${encodeURIComponent(query)}`;
    }
  }

  return enhancedURL;
};

/**
 * Parse URL parameters from career recommendation page
 * @returns {Object} - Parsed parameters
 */
export const parseCareerURLParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    career: params.get('career'),
    level: params.get('level'),
    skills: params.get('skills') ? params.get('skills').split(',').map(s => s.trim()) : [],
    location: params.get('location')
  };
};

/**
 * Copy career recommendation link to clipboard
 * @param {string} url - URL to copy
 * @returns {Promise<boolean>} - Success status
 */
export const copyToClipboard = async (url) => {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

/**
 * Generate example links for common careers
 * @returns {Array<Object>} - Array of example career links
 */
export const getExampleCareerLinks = () => [
  {
    careerName: 'Full Stack Developer',
    url: buildCareerRecommendationURL({
      career: 'full-stack-developer',
      skills: ['react', 'nodejs', 'mongodb']
    })
  },
  {
    careerName: 'Data Scientist',
    url: buildCareerRecommendationURL({
      career: 'data-scientist',
      skills: ['python', 'machine-learning']
    })
  },
  {
    careerName: 'UI/UX Designer',
    url: buildCareerRecommendationURL({
      career: 'ui-ux-designer',
      skills: ['figma', 'design-thinking']
    })
  },
  {
    careerName: 'DevOps Engineer',
    url: buildCareerRecommendationURL({
      career: 'devops-engineer',
      level: 'mid',
      skills: ['docker', 'kubernetes']
    })
  }
];
