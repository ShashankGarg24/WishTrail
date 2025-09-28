import { useEffect, useState } from 'react'
import useApiStore from '../../store/apiStore'
import { communitiesAPI } from '../../services/api'

export default function InterestsMultiSelect({ community }) {
  const { interestsCatalog, loadInterests } = useApiStore();
  const [selected, setSelected] = useState(Array.isArray(community.interests) ? community.interests : []);
  useEffect(() => { if (!interestsCatalog || interestsCatalog.length === 0) loadInterests().catch(() => {}) }, []);
  useEffect(() => { setSelected(Array.isArray(community.interests) ? community.interests : []) }, [community.interests]);
  const list = (interestsCatalog && interestsCatalog.length > 0)
    ? interestsCatalog.map(x => x.interest)
    : ['fitness','health','travel','education','career','finance','hobbies','relationships','personal_growth','creativity','technology','business','lifestyle','spirituality','sports','music','art','reading','cooking','gaming','nature','volunteering'];
  const toggle = async (val) => {
    const active = selected.includes(val);
    const next = active ? selected.filter(i => i !== val) : [...selected, val];
    setSelected(next);
    try { await communitiesAPI.update(community._id, { interests: next }); } catch {}
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {list.map((i) => {
          const active = selected.includes(i);
          const label = i.replace(/_/g,' ');
          return (
            <button key={i} onClick={() => toggle(i)} className={`px-2.5 py-1.5 rounded-full text-xs border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>{label}</button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="text-xs text-gray-500">{selected.length} selected</div>
      )}
    </div>
  );
}


