import { useEffect, useState } from 'react';
import { FaPlusCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { careerAPI } from '../../utils/api';
import { useAdminNotification } from '../../context/AdminNotificationContext';

function SkillsKeywords() {
  const [careers, setCareers] = useState([]);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [selectedCareerId, setSelectedCareerId] = useState('');
  const [careerDetail, setCareerDetail] = useState(null);
  const [technicalSkill, setTechnicalSkill] = useState('');
  const [softSkill, setSoftSkill] = useState('');
  const { notify } = useAdminNotification();

  useEffect(() => {
    const loadCareers = async () => {
      setLoadingCareers(true);
      try {
        const response = await careerAPI.getAllCareers({ limit: 100 });
        const payload = response?.data || response;
        const careersList =
          payload?.careers ||
          payload?.data?.careers ||
          (Array.isArray(payload) ? payload : []);
        setCareers(careersList);
      } catch (err) {
        notify(err.message || 'Failed to load careers', 'error');
      } finally {
        setLoadingCareers(false);
      }
    };
    loadCareers();
  }, [notify]);

  const loadCareerDetail = async (careerId) => {
    try {
      const response = await careerAPI.getCareerDetails(careerId);
      const payload = response?.data || response;
      setCareerDetail(payload?.data || payload);
    } catch (err) {
      notify(err.message || 'Failed to load career details', 'error');
    }
  };

  const handleCareerChange = (e) => {
    const id = e.target.value;
    setSelectedCareerId(id);
    if (id) loadCareerDetail(id);
  };

  const handleAddSkill = (type) => {
    if (type === 'technical' && technicalSkill.trim()) {
      setCareerDetail((prev) => ({
        ...prev,
        requiredSkills: {
          ...prev.requiredSkills,
          technical: [...(prev.requiredSkills?.technical || []), technicalSkill.trim()],
        },
      }));
      setTechnicalSkill('');
    }
    if (type === 'soft' && softSkill.trim()) {
      setCareerDetail((prev) => ({
        ...prev,
        requiredSkills: {
          ...prev.requiredSkills,
          soft: [...(prev.requiredSkills?.soft || []), softSkill.trim()],
        },
      }));
      setSoftSkill('');
    }
  };

  const handleRemoveSkill = (type, skill) => {
    setCareerDetail((prev) => ({
      ...prev,
      requiredSkills: {
        ...prev.requiredSkills,
        [type]: prev.requiredSkills?.[type]?.filter((s) => s !== skill) || [],
      },
    }));
  };

  const handleSave = async () => {
    if (!careerDetail?._id) return;
    try {
      await careerAPI.updateCareer(careerDetail._id, {
        requiredSkills: careerDetail.requiredSkills,
      });
      notify('Skills and keywords updated successfully.', 'success');
    } catch (err) {
      notify(err.message || 'Failed to update skills', 'error');
    }
  };

  return (
    <AdminLayout title="Skills & Keywords" eyebrow="ATS Keyword Management">
      <div className="bg-white/90 rounded-2xl shadow-xl border border-slate-200 p-6 mb-6">
        <label className="text-sm font-semibold text-slate-700">Select Career Profile</label>
        <select
          value={selectedCareerId}
          onChange={handleCareerChange}
          disabled={loadingCareers || careers.length === 0}
          className="w-full mt-2 px-4 py-2 border border-slate-200 rounded-lg"
        >
          <option value="">{loadingCareers ? 'Loading careers...' : 'Choose a career'}</option>
          {careers.map((career) => (
            <option key={career._id} value={career._id}>
              {career.careerName}
            </option>
          ))}
        </select>

        {!loadingCareers && careers.length === 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No career profiles found yet. Create career profiles first to manage skills and keywords.
            <Link to="/admin/careers" className="ml-2 font-semibold underline">
              Go to Career Profiles
            </Link>
          </div>
        )}
      </div>

      {careerDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/90 rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Technical Skills</h3>
            <div className="flex gap-2 mb-4">
              <input
                value={technicalSkill}
                onChange={(e) => setTechnicalSkill(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                placeholder="Add a technical skill"
              />
              <button
                onClick={() => handleAddSkill('technical')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <FaPlusCircle />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(careerDetail.requiredSkills?.technical || []).map((skill) => (
                <span
                  key={skill}
                  className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {skill}
                  <button onClick={() => handleRemoveSkill('technical', skill)} className="text-teal-600">x</button>
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/90 rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Soft Skills</h3>
            <div className="flex gap-2 mb-4">
              <input
                value={softSkill}
                onChange={(e) => setSoftSkill(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg"
                placeholder="Add a soft skill"
              />
              <button
                onClick={() => handleAddSkill('soft')}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <FaPlusCircle />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(careerDetail.requiredSkills?.soft || []).map((skill) => (
                <span
                  key={skill}
                  className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  {skill}
                  <button onClick={() => handleRemoveSkill('soft', skill)} className="text-amber-600">x</button>
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold"
            >
              Save Keywords
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default SkillsKeywords;
