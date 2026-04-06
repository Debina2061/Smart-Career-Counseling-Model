const DEFAULT_JOB_PORTALS = [
  {
    name: "MeroJob",
    base_url: "https://merojob.com/search/?q=",
    query_param: ""
  },
  {
    name: "KumariJob",
    base_url: "https://www.kumarijob.com/search?keyword=",
    query_param: ""
  },
  {
    name: "JobsNepal",
    base_url: "https://www.jobsnepal.com/search?keyword=",
    query_param: ""
  },
  {
    name: "RamroJob",
    base_url: "https://www.ramrojob.com/search?q=",
    query_param: ""
  },
  {
    name: "InternSathi",
    base_url: "https://internsathi.com/search?q=",
    query_param: ""
  },
  {
    name: "Sajilo Job",
    base_url: "https://www.sajilojob.com/jobs?q=",
    query_param: ""
  },
  {
    name: "Job in Nepal",
    base_url: "https://jobinnepal.com/search?q=",
    query_param: ""
  },
  {
    name: "Vacancy and Job",
    base_url: "https://www.vacancyandjob.com/search?keyword=",
    query_param: ""
  }
];

/**
 * Generate portal links with CLEAN job titles only
 * No skills, no location, no extra keywords
 */
export const generatePortalLinks = (jobTitle, portals = DEFAULT_JOB_PORTALS) => {
  if (!jobTitle || typeof jobTitle !== "string") return [];

  const cleanTitle = jobTitle.trim();

  return (portals || [])
    .filter((portal) => portal && portal.base_url)
    .map((portal) => {
      // Encode the job title for URL
      const encodedTitle = encodeURIComponent(cleanTitle);
      let search_url = "";

      // If query_param is set, use it
      if (portal.query_param) {
        const separator = portal.base_url.includes("?") ? "&" : "?";
        search_url = `${portal.base_url}${separator}${portal.query_param}=${encodedTitle}`;
      } else {
        // If query_param is empty, the parameter is already in base_url
        search_url = `${portal.base_url}${encodedTitle}`;
      }

      return {
        portal_name: portal.name,
        search_url: search_url
      };
    });
};

/**
 * Generate clean job search links - ONLY job title, nothing else
 * Used for recommendation generation
 * 
 * Example:
 * Input: { career_name: "Full Stack Developer", ats_score: 75 }
 * Output: "Full Stack Developer" (searches on job portals)
 */
export const generateJobSearchLinks = (input = {}, portals = DEFAULT_JOB_PORTALS) => {
  const careerName = input?.career_name || "";
  const atsScore = Number.isFinite(input?.ats_score) ? input.ats_score : 0;

  if (!careerName.trim()) {
    return {
      final_keyword: "",
      job_level: "Entry Level",
      job_portals: [],
      search_params: {}
    };
  }

  // Use ONLY the career name - no level prefix, no skills, no location
  const jobTitle = careerName.trim();

  // Determine job level for display only (not in search)
  let jobLevel = "Entry Level";
  if (atsScore >= 80) {
    jobLevel = "Senior Level";
  } else if (atsScore >= 60) {
    jobLevel = "Junior Level";
  }

  return {
    final_keyword: jobTitle,
    job_level: jobLevel,
    job_portals: generatePortalLinks(jobTitle, portals),
    search_params: {
      career: careerName,
      level: jobLevel,
      atsScore: atsScore
    }
  };
};

/**
 * Generate clean job search links with custom search criteria
 * Used for auto-search feature
 * 
 * Example:
 * Input: { career: "Full Stack Developer", level: "mid" }
 * Output: "Mid-Level Full Stack Developer" (searches on job portals)
 */
export const generateCustomJobSearchLinks = (searchParams = {}, portals = DEFAULT_JOB_PORTALS) => {
  const { career = "", level = "" } = searchParams;

  if (!career.trim()) {
    return {
      final_keyword: "",
      job_level: "Entry Level",
      job_portals: [],
      search_params: {}
    };
  }

  // Start with career name
  let jobTitle = career.trim();
  let levelLabel = "Entry Level";

  // Add level prefix only if provided
  if (level) {
    const levelMap = {
      'entry': 'Entry',
      'junior': 'Junior',
      'mid': 'Mid-Level',
      'senior': 'Senior',
      'mid-level': 'Mid-Level'
    };

    levelLabel = levelMap[level.toLowerCase()] || level;

    // Add level prefix if not already in title
    if (!jobTitle.toLowerCase().includes(levelLabel.toLowerCase())) {
      jobTitle = `${levelLabel} ${jobTitle}`;
    }
  }

  // Clean up: remove extra spaces
  jobTitle = jobTitle.trim().replace(/\s+/g, " ");

  return {
    final_keyword: jobTitle,
    job_level: levelLabel,
    job_portals: generatePortalLinks(jobTitle, portals),
    search_params: {
      career,
      level: levelLabel
    }
  };
};

export const JOB_PORTALS = DEFAULT_JOB_PORTALS;
