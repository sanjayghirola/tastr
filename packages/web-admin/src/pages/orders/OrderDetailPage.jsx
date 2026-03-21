import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

// ─── Reassign Driver Modal ────────────────────────────────────────────────────
function ReassignDriverModal({ orderId, onClose, onSuccess }) {
  const [drivers,  setDrivers]  = useState([]);
  const [selected, setSelected] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.get('/admin/drivers?status=online&limit=30')
      .then(r => setDrivers(r.data.drivers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function confirm() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/admin/orders/${orderId}/reassign`, { driverId: selected });
      onSuccess();
    } catch {
      alert('Failed to reassign driver');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-[#E8D9C0]">
          <h3 className="text-lg font-bold text-gray-800">Reassign Driver</h3>
          <p className="text-sm text-gray-400 mt-1">Select an online driver to assign to this order</p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : drivers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No online drivers available</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {drivers.map(driver => (
                <label
                  key={driver._id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                    ${selected === driver._id ? 'border-[#C18B3C] bg-[#FAF0E0]' : 'border-gray-200 hover:border-[#C18B3C]/50'}`}
                >
                  <input
                    type="radio"
                    name="driver"
                    value={driver._id}
                    checked={selected === driver._id}
                    onChange={() => setSelected(driver._id)}
                    className="accent-[#C18B3C]"
                  />
                  <img
                    src={driver.photo || '/avatar-placeholder.png'}
                    className="w-9 h-9 rounded-full object-cover"
                    alt={driver.name}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800">{driver.name}</p>
                    <p className="text-xs text-gray-400">{driver.vehicle} · ⭐ {driver.rating?.toFixed(1) || '—'}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!selected || saving}
            className="flex-1 py-3 rounded-2xl bg-[#C18B3C] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#a97430]"
          >
            {saving ? 'Reassigning…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Issue Refund Modal ───────────────────────────────────────────────────────
function IssueRefundModal({ order, onClose, onSuccess }) {
  const [type,    setType]    = useState('full');
  const [amount,  setAmount]  = useState('');
  const [reason,  setReason]  = useState('');
  const [saving,  setSaving]  = useState(false);

  const maxRefund = (order.total || 0) / 100;

  async function confirm() {
    if (!reason.trim()) return alert('Please enter a reason');
    const refundPence = type === 'full'
      ? order.total
      : Math.round(parseFloat(amount) * 100);
    if (type === 'partial' && (isNaN(refundPence) || refundPence <= 0 || refundPence > order.total)) {
      return alert(`Amount must be between £0.01 and £${maxRefund.toFixed(2)}`);
    }
    setSaving(true);
    try {
      await api.post(`/admin/orders/${order._id}/refund`, { amountPence: refundPence, reason });
      onSuccess();
    } catch {
      alert('Failed to issue refund');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-[#E8D9C0]">
          <h3 className="text-lg font-bold text-gray-800">Issue Refund</h3>
          <p className="text-sm text-gray-400 mt-1">Order #{order.orderId} · Total £{maxRefund.toFixed(2)}</p>
        </div>
        <div className="p-6 space-y-4">
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            {['full', 'partial'].map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`py-2 rounded-xl text-sm font-semibold border transition-colors
                  ${type === t ? 'bg-[#C18B3C] text-white border-[#C18B3C]' : 'border-gray-200 text-gray-600 hover:border-[#C18B3C]'}`}
              >
                {t === 'full' ? `Full Refund (£${maxRefund.toFixed(2)})` : 'Partial Refund'}
              </button>
            ))}
          </div>

          {/* Amount (partial only) */}
          {type === 'partial' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Refund Amount (£)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefund}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Max £${maxRefund.toFixed(2)}`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C18B3C]"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Reason *</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Reason for refund…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C18B3C] resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-red-600"
          >
            {saving ? 'Processing…' : 'Issue Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function Timeline({ events }) {
  return (
    <div className="space-y-3">
      {(events || []).map((event, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-3 h-3 rounded-full bg-[#C18B3C] mt-1 shrink-0 ring-2 ring-[#C18B3C]/20" />
          <div>
            <p className="text-sm font-semibold text-gray-700 capitalize">{event.status?.replace(/_/g, ' ')}</p>
            {event.note && <p className="text-xs text-gray-400">{event.note}</p>}
            <p className="text-xs text-gray-300 mt-0.5">
              {new Date(event.at || event.createdAt).toLocaleString()}
            </p>
          </div>
          {i < events.length - 1 && (
            <div className="absolute ml-1.5 mt-4 w-0.5 h-6 bg-[#E8D9C0]" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Info card ────────────────────────────────────────────────────────────────
function InfoCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8D9C0] p-5 shadow-sm">
      <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

// ─── OrderDetailPage ──────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [order,          setOrder]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [showReassign,   setShowReassign]   = useState(false);
  const [showRefund,     setShowRefund]     = useState(false);

  useEffect(() => {
    api.get(`/admin/orders/${id}`)
      .then(r => setOrder(r.data.order))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!confirm('Cancel this order?')) return;
    try {
      await api.patch(`/admin/orders/${id}/cancel`);
      setOrder(o => ({ ...o, status: 'cancelled' }));
    } catch { alert('Failed to cancel'); }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="p-6 text-center text-gray-400">
      <p>Order not found</p>
      <button onClick={() => navigate('/orders')} className="mt-2 text-[#C18B3C] underline text-sm">Back</button>
    </div>
  );

  const canCancel  = !['delivered', 'cancelled', 'failed'].includes(order.status);
  const canRefund  = ['delivered', 'cancelled'].includes(order.status) && !order.refundAmount;
  const canReassign = ['placed', 'accepted', 'preparing', 'ready'].includes(order.status);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/orders')} className="text-[#C18B3C] font-semibold text-sm hover:underline">
          ← Orders
        </button>
        <span className="text-gray-300">/</span>
        <span className="font-mono text-sm text-gray-600">{order.orderId}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {canReassign && (
          <button
            onClick={() => setShowReassign(true)}
            className="px-4 py-2 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600"
          >
            Reassign Driver
          </button>
        )}
        {canRefund && (
          <button
            onClick={() => setShowRefund(true)}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
          >
            Issue Refund
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50"
          >
            Cancel Order
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer */}
        <InfoCard title="Customer">
          <p className="font-semibold text-gray-800">{order.customerId?.name || '—'}</p>
          <p className="text-sm text-gray-500">{order.customerId?.email}</p>
          <p className="text-sm text-gray-500">{order.customerId?.phone}</p>
          <p className="text-xs text-gray-400 mt-2">
            📍 {[order.deliveryAddress?.line1, order.deliveryAddress?.city, order.deliveryAddress?.postcode].filter(Boolean).join(', ') || '—'}
          </p>
        </InfoCard>

        {/* Restaurant */}
        <InfoCard title="Restaurant">
          <p className="font-semibold text-gray-800">{order.restaurantId?.name || '—'}</p>
          <p className="text-sm text-gray-500">{[order.restaurantId?.address?.line1, order.restaurantId?.address?.city, order.restaurantId?.address?.postcode].filter(Boolean).join(', ') || '—'}</p>
          <p className="text-sm text-gray-500">{order.restaurantId?.phone}</p>
        </InfoCard>

        {/* Driver */}
        <InfoCard title="Driver">
          {order.driverId ? (
            <>
              <div className="flex items-center gap-3">
                <img src={order.driverId.photo || '/avatar-placeholder.png'} className="w-10 h-10 rounded-full" alt="" />
                <div>
                  <p className="font-semibold text-gray-800">{order.driverId.name}</p>
                  <p className="text-sm text-gray-500">{order.driverId.vehicle}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Not yet assigned</p>
          )}
        </InfoCard>

        {/* Payment */}
        <InfoCard title="Payment">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="font-medium capitalize">{order.paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>£{((order.subtotal || 0) / 100).toFixed(2)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-£{(order.discount / 100).toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>£{((order.deliveryFee || 0) / 100).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">VAT</span><span>£{((order.vatAmount || 0) / 100).toFixed(2)}</span></div>
            {order.tip > 0 && <div className="flex justify-between"><span className="text-gray-500">Tip</span><span>£{(order.tip / 100).toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold border-t border-[#E8D9C0] pt-1 mt-1">
              <span>Total</span><span className="text-[#C18B3C]">£{((order.total || 0) / 100).toFixed(2)}</span>
            </div>
            {order.refundAmount > 0 && (
              <div className="flex justify-between text-red-500 text-xs">
                <span>Refunded</span><span>-£{(order.refundAmount / 100).toFixed(2)}</span>
              </div>
            )}
          </div>
        </InfoCard>

        {/* Items */}
        <InfoCard title={`Items (${order.items?.length || 0})`}>
          <div className="space-y-2">
            {order.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span>{item.quantity}× {item.name}</span>
                  {item.selectedToppings?.length > 0 && (
                    <p className="text-xs text-gray-400">+ {item.selectedToppings.map(t => t.name).join(', ')}</p>
                  )}
                </div>
                <span className="text-gray-600">£{(item.subtotal / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </InfoCard>

        {/* Timeline */}
        <InfoCard title="Timeline">
          <Timeline events={order.timeline} />
        </InfoCard>
      </div>

      {showReassign && (
        <ReassignDriverModal
          orderId={order._id}
          onClose={() => setShowReassign(false)}
          onSuccess={() => { setShowReassign(false); window.location.reload(); }}
        />
      )}

      {showRefund && (
        <IssueRefundModal
          order={order}
          onClose={() => setShowRefund(false)}
          onSuccess={() => { setShowRefund(false); window.location.reload(); }}
        />
      )}
    </div>
  );
}
