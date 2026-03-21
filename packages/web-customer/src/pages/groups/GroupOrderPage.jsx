import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

// ─── Create Group Form ────────────────────────────────────────────────────────
function CreateGroupForm({ onCreated }) {
  const [name,         setName]         = useState('');
  const [restaurantQ,  setRestaurantQ]  = useState('');
  const [restaurants,  setRestaurants]  = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [searching,    setSearching]    = useState(false);
  const [creating,     setCreating]     = useState(false);
  const [error,        setError]        = useState('');

  async function searchRestaurants(q) {
    setRestaurantQ(q);
    if (q.length < 2) { setRestaurants([]); return; }
    setSearching(true);
    try {
      const r = await api.get(`/search?q=${encodeURIComponent(q)}&limit=6`);
      setRestaurants(r.data.restaurants || []);
    } catch { setRestaurants([]); }
    finally { setSearching(false); }
  }

  async function create() {
    if (!name.trim()) return setError('Group name is required');
    if (!selected)    return setError('Please select a restaurant');
    setCreating(true);
    setError('');
    try {
      const r = await api.post('/group-orders', { name: name.trim(), restaurantId: selected._id });
      onCreated(r.data.group);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create group');
    } finally { setCreating(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-medium">Group Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Friday team lunch"
          className="w-full border border-[#E8D9C0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#C18B3C] bg-[#FAF7F2]"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-medium">Restaurant</label>
        <input
          value={restaurantQ}
          onChange={e => searchRestaurants(e.target.value)}
          placeholder="Search restaurant…"
          className="w-full border border-[#E8D9C0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#C18B3C] bg-[#FAF7F2]"
        />
        {searching && <p className="text-xs text-gray-400 mt-1 px-1">Searching…</p>}
        {restaurants.length > 0 && !selected && (
          <div className="mt-2 bg-white border border-[#E8D9C0] rounded-2xl overflow-hidden shadow-sm">
            {restaurants.map(r => (
              <button
                key={r._id}
                onClick={() => { setSelected(r); setRestaurantQ(r.name); setRestaurants([]); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAF7F2] border-b border-[#E8D9C0] last:border-0 text-left"
              >
                <img src={r.logoUrl || r.coverImage} alt={r.name} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.cuisineType}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-3 py-2">
            <img src={selected.logoUrl || selected.coverImage} className="w-8 h-8 rounded-lg object-cover" alt="" />
            <span className="text-sm font-medium text-green-700">{selected.name}</span>
            <button onClick={() => { setSelected(null); setRestaurantQ(''); }} className="ml-auto text-green-500 text-xs underline">Change</button>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-xs px-1">{error}</p>}
      <button
        onClick={create}
        disabled={creating}
        className="w-full py-3 rounded-2xl bg-[#C18B3C] text-white font-bold text-sm disabled:opacity-50 hover:bg-[#a97430] transition-colors"
      >
        {creating ? 'Creating…' : 'Create Group Order'}
      </button>
    </div>
  );
}

// ─── Join Group Form ──────────────────────────────────────────────────────────
function JoinGroupForm({ onJoined, initialGroupId = '', initialCode = '' }) {
  const [code,    setCode]    = useState(initialCode);
  const [groupId, setGroupId] = useState(initialGroupId);
  const [joining, setJoining] = useState(false);
  const [error,   setError]   = useState('');

  // Auto-join if both values are pre-filled from URL
  useEffect(() => {
    if (initialGroupId && initialCode) {
      join();
    }
  }, []);

  async function join() {
    const gid = groupId || initialGroupId;
    const c = code || initialCode;
    if (!c.trim() || !gid.trim()) return setError('Both Group ID and invite code are required');
    setJoining(true);
    setError('');
    try {
      const r = await api.post(`/group-orders/${gid}/join`, { inviteCode: c.trim() });
      onJoined(r.data.group);
    } catch (e) {
      setError(e.response?.data?.message || 'Invalid code or group not found');
    } finally { setJoining(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-medium">Group ID</label>
        <input
          value={groupId}
          onChange={e => setGroupId(e.target.value.trim())}
          placeholder="Paste group ID from link"
          className="w-full border border-[#E8D9C0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#C18B3C] bg-[#FAF7F2] font-mono"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1 font-medium">Invite Code</label>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. A1B2C3D4"
          maxLength={8}
          className="w-full border border-[#E8D9C0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#C18B3C] bg-[#FAF7F2] font-mono text-center text-lg tracking-widest uppercase"
        />
      </div>
      {error && <p className="text-red-500 text-xs px-1">{error}</p>}
      <button
        onClick={join}
        disabled={joining}
        className="w-full py-3 rounded-2xl bg-[#C18B3C] text-white font-bold text-sm disabled:opacity-50 hover:bg-[#a97430] transition-colors"
      >
        {joining ? 'Joining…' : 'Join Group'}
      </button>
    </div>
  );
}

// ─── Main GroupOrderPage ──────────────────────────────────────────────────────
export default function GroupOrderPage() {
  const navigate = useNavigate();
  const { groupId: urlGroupId } = useParams();
  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code') || '';

  // Auto-switch to join tab if URL has groupId (e.g. /group/:id/join?code=XXX)
  const isJoinUrl = !!urlGroupId;
  const [tab, setTab] = useState(isJoinUrl ? 'join' : 'create');

  function handleCreated(group) {
    navigate(`/group/${group._id}/invite`, { state: { group } });
  }

  function handleJoined(group) {
    // Navigate to the restaurant page so the member can add items
    navigate(`/restaurants/${group.restaurantId?._id || group.restaurantId}`, {
      state: { groupId: group._id, groupName: group.name }
    });
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="bg-white border-b border-[#E8D9C0] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#C18B3C] font-bold text-lg">←</button>
        <p className="font-bold text-gray-800">Group Order</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍽️👥</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Order together</h1>
          <p className="text-gray-500 text-sm">Create a group order and let everyone add their own items</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#EDE0CC] rounded-2xl p-1 mb-6">
          {[['create', 'Create a Group'], ['join', 'Join Existing']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${tab === key ? 'bg-white text-[#C18B3C] shadow' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl border border-[#E8D9C0] p-6 shadow-sm">
          {tab === 'create'
            ? <CreateGroupForm onCreated={handleCreated} />
            : <JoinGroupForm   onJoined={handleJoined} initialGroupId={urlGroupId || ''} initialCode={urlCode} />
          }
        </div>

        {/* My active groups */}
        <button
          onClick={() => navigate('/groups/my')}
          className="w-full mt-4 py-3 rounded-2xl border border-[#E8D9C0] text-[#C18B3C] font-semibold text-sm hover:bg-[#FAF0E0] transition-colors"
        >
          View my active groups →
        </button>
      </div>
    </div>
  );
}
