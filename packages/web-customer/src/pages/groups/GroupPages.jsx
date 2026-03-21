import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { connectSocket } from '../../services/socket';

// ─── QR Code using Google Charts API ─────────────────────────────────────────
function QRCode({ value, size = 160 }) {
  const url = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(value)}&choe=UTF-8`;
  return <img src={url} alt="QR Code" className="rounded-xl" width={size} height={size} />;
}

// ─── InvitePanel ──────────────────────────────────────────────────────────────
export function InvitePanel() {
  const navigate     = useNavigate();
  const { state }    = useLocation();
  const { groupId }  = useParams();
  const [group, setGroup] = useState(state?.group || null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!group && groupId) {
      api.get(`/group-orders/${groupId}`).then(r => setGroup(r.data.group)).catch(() => {});
    }
  }, [groupId]);

  if (!group) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const inviteUrl = `${window.location.origin}/group/${group._id}/join?code=${group.inviteCode}`;

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: `Join my group order: ${group.name}`, url: inviteUrl });
    } else {
      copyLink();
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="bg-white border-b border-[#E8D9C0] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#C18B3C] font-bold text-lg">←</button>
        <p className="font-bold text-gray-800">Invite People</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 flex flex-col items-center gap-6">
        {/* Group name */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">{group.name}</h2>
          <p className="text-sm text-gray-400 mt-1">{group.restaurantId?.name}</p>
        </div>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-3xl border border-[#E8D9C0] shadow-sm">
          <QRCode value={inviteUrl} size={180} />
        </div>

        {/* Invite code */}
        <div className="w-full bg-white rounded-3xl border border-[#E8D9C0] p-5 shadow-sm text-center">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Invite Code</p>
          <p className="text-4xl font-black text-[#C18B3C] tracking-widest font-mono">{group.inviteCode}</p>
          <p className="text-xs text-gray-400 mt-2">Share this code with your group</p>
        </div>

        {/* Action buttons */}
        <div className="w-full flex gap-3">
          <button
            onClick={copyLink}
            className={`flex-1 py-3 rounded-2xl border text-sm font-semibold transition-colors
              ${copied ? 'border-green-400 bg-green-50 text-green-700' : 'border-[#E8D9C0] text-gray-600 hover:bg-[#EDE0CC]'}`}
          >
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
          <button
            onClick={share}
            className="flex-1 py-3 rounded-2xl bg-[#C18B3C] text-white font-semibold text-sm hover:bg-[#a97430] transition-colors"
          >
            📤 Share
          </button>
        </div>

        {/* Start ordering */}
        <button
          onClick={() => navigate(`/restaurants/${group.restaurantId?._id || group.restaurantId}`, {
            state: { groupId: group._id, groupName: group.name }
          })}
          className="w-full py-4 rounded-2xl bg-gray-800 text-white font-bold text-sm hover:bg-gray-700 transition-colors"
        >
          Start Adding My Items →
        </button>
      </div>
    </div>
  );
}

// ─── Group member item row ────────────────────────────────────────────────────
function MemberRow({ member }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-[#E8D9C0] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 hover:bg-[#FAF7F2] transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-[#C18B3C] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {member.userId?.name?.charAt(0) || member.displayName?.charAt(0) || '?'}
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-gray-800 text-sm">{member.userId?.name || member.displayName}</p>
          <p className="text-xs text-gray-400">{member.items?.length || 0} item{member.items?.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-[#C18B3C]">£{(member.subtotal / 100).toFixed(2)}</p>
          <p className="text-[#C18B3C] text-xs">{open ? '▲' : '▼'}</p>
        </div>
      </button>
      {open && member.items?.length > 0 && (
        <div className="border-t border-[#E8D9C0] px-4 pb-4">
          {member.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5">
              <span>{item.quantity}× {item.name}</span>
              <span className="text-gray-500">£{(item.subtotal / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GroupSummaryPage (host view) ─────────────────────────────────────────────
export function GroupSummaryPage() {
  const { groupId }  = useParams();
  const navigate     = useNavigate();
  const [group,      setGroup]      = useState(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [payMethod,  setPayMethod]  = useState('CARD');

  // Delivery address
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ line1: '', city: '', postcode: '', country: 'GB' });
  const [addrSaving, setAddrSaving] = useState(false);

  const userId = useSelector(state => state.auth.user?._id);
  const userAddresses = useSelector(state => state.auth.user?.addresses || []);

  useEffect(() => {
    fetchSummary();

    const socket = connectSocket();
    socket.emit('join:group', { groupId });
    socket.on('group:member-joined', () => fetchSummary());
    socket.on('group:item-added',    () => fetchSummary());
    socket.on('group:item-updated',  () => fetchSummary());

    return () => {
      socket.emit('leave:group', { groupId });
      socket.off('group:member-joined');
      socket.off('group:item-added');
      socket.off('group:item-updated');
    };
  }, [groupId]);

  async function fetchSummary() {
    try {
      const r = await api.get(`/group-orders/${groupId}/summary`);
      setGroup(r.data.group);
      setGrandTotal(r.data.grandTotal || 0);
    } catch { /* handle */ }
    finally { setLoading(false); }
  }

  const currentAddr = group?.deliveryAddress?.line1 ? group.deliveryAddress : null;

  async function saveAddress() {
    if (!addrForm.line1.trim()) return alert('Address line 1 is required');
    setAddrSaving(true);
    try {
      await api.put(`/group-orders/${groupId}/address`, addrForm);
      await fetchSummary();
      setShowAddrForm(false);
    } catch (e) { alert(e.response?.data?.message || 'Failed to save address'); }
    finally { setAddrSaving(false); }
  }

  async function useSavedAddress(addr) {
    setAddrSaving(true);
    try {
      await api.put(`/group-orders/${groupId}/address`, {
        line1: addr.line1, city: addr.city, postcode: addr.postcode,
        country: addr.country || 'GB', lat: addr.lat, lng: addr.lng,
      });
      await fetchSummary();
    } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    finally { setAddrSaving(false); }
  }

  async function handleCheckout() {
    if (!currentAddr) { alert('Please set a delivery address first'); return; }
    setCheckingOut(true);
    try {
      const r = await api.post(`/group-orders/${groupId}/checkout`, {
        paymentMethod: payMethod,
        deliveryAddress: currentAddr,
      });
      if (r.data.clientSecret) {
        navigate('/checkout/stripe-confirm', {
          state: { clientSecret: r.data.clientSecret, orderId: r.data.order._id, orderRef: r.data.order.orderId },
        });
      } else {
        navigate(`/order-success`, { state: { order: r.data.order } });
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Checkout failed');
    } finally { setCheckingOut(false); }
  }

  const isHost = (group?.hostId?._id || group?.hostId)?.toString() === userId?.toString();

  if (loading) return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28">
      <div className="bg-white border-b border-[#E8D9C0] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-[#C18B3C] font-bold text-lg">←</button>
          <div>
            <p className="font-bold text-gray-800 text-sm">{group?.name}</p>
            <p className="text-xs text-gray-400">{group?.restaurantId?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${group?.status === 'open' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500 capitalize">{group?.status}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Invite code chip */}
        {group?.status === 'open' && (
          <button
            onClick={() => navigate(`/group/${groupId}/invite`)}
            className="w-full flex items-center justify-between bg-[#FAF0E0] border border-[#E8D9C0] rounded-2xl px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span>🔗</span>
              <span className="text-sm font-semibold text-[#C18B3C]">Invite code: {group.inviteCode}</span>
            </div>
            <span className="text-xs text-[#C18B3C]">Share →</span>
          </button>
        )}

        {/* Member rows */}
        <h3 className="font-bold text-gray-700 text-sm mt-2">Members ({group?.members?.length || 0})</h3>
        {group?.members?.map((m, i) => <MemberRow key={i} member={m} />)}

        {/* Grand total */}
        <div className="bg-white rounded-2xl border border-[#E8D9C0] p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Grand Total</span>
            <span className="text-xl font-black text-[#C18B3C]">£{(grandTotal / 100).toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">+ delivery fee and VAT at checkout</p>
        </div>

        {/* Delivery Address (host only) */}
        {isHost && (
          <div className="bg-white rounded-2xl border border-[#E8D9C0] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-700 text-sm">📍 Delivery Address</h3>
              {currentAddr && <button onClick={() => setShowAddrForm(true)} className="text-xs text-[#C18B3C] font-semibold">Change</button>}
            </div>

            {currentAddr ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-800 font-medium">{currentAddr.line1}</p>
                <p className="text-xs text-green-600">{[currentAddr.city, currentAddr.postcode].filter(Boolean).join(', ')}</p>
              </div>
            ) : (
              <div>
                {/* Saved addresses */}
                {userAddresses.length > 0 && !showAddrForm && (
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-gray-500 font-medium">Use saved address:</p>
                    {userAddresses.map((a, i) => (
                      <button key={i} onClick={() => useSavedAddress(a)} disabled={addrSaving}
                        className="w-full text-left bg-[#FAF7F2] border border-[#E8D9C0] rounded-xl p-3 hover:border-[#C18B3C] transition-colors">
                        <p className="text-sm font-medium text-gray-800">{a.label || 'Home'}: {a.line1}</p>
                        <p className="text-xs text-gray-500">{a.city}, {a.postcode}</p>
                      </button>
                    ))}
                    <button onClick={() => setShowAddrForm(true)} className="text-xs text-[#C18B3C] font-semibold mt-1">+ Enter new address</button>
                  </div>
                )}

                {(showAddrForm || userAddresses.length === 0) && (
                  <div className="space-y-3">
                    <input value={addrForm.line1} onChange={e => setAddrForm(f => ({...f, line1: e.target.value}))}
                      placeholder="Delivery address" className="w-full border border-[#E8D9C0] rounded-xl px-3 py-2.5 text-sm focus:border-[#C18B3C] outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={addrForm.city} onChange={e => setAddrForm(f => ({...f, city: e.target.value}))}
                        placeholder="City / town" className="border border-[#E8D9C0] rounded-xl px-3 py-2.5 text-sm focus:border-[#C18B3C] outline-none" />
                      <input value={addrForm.postcode} onChange={e => setAddrForm(f => ({...f, postcode: e.target.value}))}
                        placeholder="Postcode" className="border border-[#E8D9C0] rounded-xl px-3 py-2.5 text-sm focus:border-[#C18B3C] outline-none" />
                    </div>
                    <button onClick={saveAddress} disabled={addrSaving}
                      className="w-full py-2.5 rounded-xl bg-gray-800 text-white font-semibold text-sm disabled:opacity-50">
                      {addrSaving ? 'Saving…' : '📍 Save Address'}
                    </button>
                  </div>
                )}

                {!showAddrForm && userAddresses.length === 0 && !currentAddr && (
                   <p className="text-xs text-red-500 mt-2">⚠ Please add a delivery address before checkout</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Checkout bar (host only) */}
      {isHost && group?.status === 'open' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8D9C0] p-4 shadow-lg">
          <div className="max-w-lg mx-auto">
            <div className="flex gap-2 mb-3">
              {['CARD', 'WALLET'].map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors
                    ${payMethod === m ? 'bg-[#C18B3C] text-white border-[#C18B3C]' : 'border-gray-200 text-gray-500'}`}>
                  {m === 'CARD' ? '💳 Card' : '👛 Wallet'}
                </button>
              ))}
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkingOut || grandTotal === 0 || !currentAddr}
              className="w-full py-4 rounded-2xl bg-[#C18B3C] text-white font-bold text-base disabled:opacity-40 hover:bg-[#a97430] transition-colors"
            >
              {checkingOut ? 'Processing…' : !currentAddr ? 'Set delivery address first' : `Checkout — £${(grandTotal / 100).toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
      {!isHost && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8D9C0] p-4">
          <p className="text-center text-sm text-gray-400">Waiting for the host to checkout…</p>
        </div>
      )}
    </div>
  );
}

// ─── My Groups Page ───────────────────────────────────────────────────────────
export function MyGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/group-orders/my')
      .then(r => setGroups(r.data.groups || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function fmtPrice(p) { return `£${((p || 0) / 100).toFixed(2)}`; }

  const statusStyle = {
    open:      'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    checked_out: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24">
      {/* Header */}
      <div className="bg-[#FAF7F2] px-4 pt-8 pb-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white border border-[#E8D9C0] flex items-center justify-center hover:bg-[#FAF0E0] transition-colors">
              <span className="text-[#C18B3C] text-lg">←</span>
            </button>
            <h1 className="text-xl font-bold text-gray-800">Group order</h1>
          </div>
          <button onClick={() => navigate('/group-order')}
            className="px-4 py-2 rounded-2xl bg-[#C18B3C] text-white text-sm font-bold hover:bg-[#a97430] transition-colors">
            + New Group
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">👥</p>
            <p className="text-lg font-bold text-gray-700 mb-1">No group orders yet</p>
            <p className="text-gray-400 text-sm mb-6">Create a group order and invite your friends or colleagues</p>
            <button onClick={() => navigate('/group-order')}
              className="px-6 py-3 rounded-2xl bg-[#C18B3C] text-white font-bold text-sm hover:bg-[#a97430] transition-colors">
              Create Group Order
            </button>
          </div>
        ) : (
          groups.map(g => {
            const isOpen = g.status === 'open';
            const isCompleted = g.status === 'completed' || g.status === 'checked_out';
            const memberCount = g.members?.length || 0;
            const maxMembers = g.maxMembers || memberCount;
            const totalItems = g.members?.reduce((sum, m) => sum + (m.items?.length || 0), 0) || 0;
            const total = g.members?.reduce((sum, m) => sum + (m.subtotal || 0), 0) || 0;

            return (
              <div key={g._id} className="bg-white rounded-2xl border border-[#E8D9C0] overflow-hidden shadow-sm">
                <div className="p-5">
                  {/* Title row */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{g.name}</h3>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusStyle[g.status] || statusStyle.open}`}>
                      {g.status === 'checked_out' ? 'Completed' : g.status}
                    </span>
                  </div>

                  {/* Restaurant & Address */}
                  <p className="text-sm text-[#C18B3C] font-medium">From: {g.restaurantId?.name || '—'}</p>
                  {g.restaurantId?.address && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Address: {[g.restaurantId.address.line1, g.restaurantId.address.city].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {/* Stats card */}
                  <div className="bg-[#FAF7F2] rounded-xl p-4 mt-3 space-y-1.5">
                    <p className="text-sm text-gray-600">
                      Created by: <span className="font-bold text-gray-800">{g.hostId?.name || 'You'}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Members joined: <span className="font-bold text-gray-800">{memberCount}/{maxMembers}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Items added: <span className="font-bold text-gray-800">{totalItems}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Total: <span className="font-bold text-gray-800">{fmtPrice(total)}</span>
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 px-5 pb-5">
                  <button onClick={() => navigate(`/group/${g._id}/summary`)}
                    className="flex-1 py-3 rounded-2xl border border-[#E8D9C0] text-gray-700 text-sm font-semibold hover:bg-[#FAF7F2] transition-colors">
                    View details
                  </button>
                  {isOpen && (
                    <button onClick={() => navigate(`/group/${g._id}/invite`)}
                      className="flex-1 py-3 rounded-2xl bg-[#C18B3C] text-white text-sm font-bold hover:bg-[#a97430] transition-colors">
                      Invite people
                    </button>
                  )}
                  {isCompleted && (
                    <button onClick={() => navigate('/group-order', { state: { repeatFrom: g } })}
                      className="flex-1 py-3 rounded-2xl bg-[#C18B3C] text-white text-sm font-bold hover:bg-[#a97430] transition-colors">
                      Repeat order
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
