import { useState, useEffect, useRef, useCallback } from 'react';
import { connectRestaurantSocket } from '../../services/socket';
import api from '../../services/api';

const STATUS_TABS = ['all', 'new', 'preparing', 'ready', 'on_way', 'completed'];

const STATUS_BADGE = {
  PENDING:         { label: 'Pending',      bg: 'bg-gray-100',   text: 'text-gray-600'   },
  PLACED:          { label: 'New',          bg: 'bg-blue-100',   text: 'text-blue-700'   },
  ACCEPTED:        { label: 'Accepted',     bg: 'bg-amber-100',  text: 'text-amber-700'  },
  PREPARING:       { label: 'Preparing',    bg: 'bg-yellow-100', text: 'text-yellow-700' },
  READY:           { label: 'Ready',        bg: 'bg-emerald-100',text: 'text-emerald-700'},
  DRIVER_ASSIGNED: { label: 'Driver Assigned', bg: 'bg-purple-100', text: 'text-purple-700' },
  ON_WAY:          { label: 'Out for Delivery', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  DELIVERED:       { label: 'Delivered',    bg: 'bg-green-100',  text: 'text-green-700'  },
  CANCELLED:       { label: 'Cancelled',    bg: 'bg-red-100',    text: 'text-red-700'    },
  REJECTED:        { label: 'Rejected',     bg: 'bg-red-100',    text: 'text-red-700'    },
  FAILED:          { label: 'Failed',       bg: 'bg-red-100',    text: 'text-red-700'    },
};

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  const cfg = STATUS_BADGE[s] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function fmtPrice(p) { return `£${((p || 0) / 100).toFixed(2)}`; }
function fmtTime(d) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }

// ─── Stat bar ───────────────────────────────────────────────────────────────
function StatBar({ orders }) {
  const s = {
    today:      orders.length,
    newOrders:  orders.filter(o => ['PLACED','PENDING'].includes(o.status)).length,
    preparing:  orders.filter(o => ['ACCEPTED','PREPARING'].includes(o.status)).length,
    ready:      orders.filter(o => o.status === 'READY').length,
    onWay:      orders.filter(o => ['DRIVER_ASSIGNED','ON_WAY'].includes(o.status)).length,
  };

  const items = [
    { label: "Active Orders", value: s.today,     icon: '📋', color: 'text-brand-600' },
    { label: 'New',           value: s.newOrders,  icon: '🔔', color: 'text-blue-600'  },
    { label: 'Preparing',     value: s.preparing,  icon: '🍳', color: 'text-yellow-600'},
    { label: 'Ready',         value: s.ready,      icon: '✅', color: 'text-emerald-600'},
    { label: 'On the Way',    value: s.onWay,      icon: '🛵', color: 'text-purple-600'},
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-5">
      {items.map(i => (
        <div key={i.label} className="bg-white rounded-2xl p-3 border border-border text-center shadow-sm">
          <p className="text-xl mb-0.5">{i.icon}</p>
          <p className={`text-2xl font-bold ${i.color}`}>{i.value}</p>
          <p className="text-[11px] text-text-muted">{i.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── New Order Alert ─────────────────────────────────────────────────────────
function NewOrderAlert({ order, onAccept, onDecline, onView }) {
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 animate-bounce">
      <div className="bg-brand-500 text-white rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div>
              <p className="font-bold text-lg">New Order!</p>
              <p className="text-sm opacity-80">#{order.orderId} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {fmtPrice(order.total)}</p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center font-bold text-xl">
            {countdown}
          </div>
        </div>

        <p className="text-sm opacity-80 mb-3">
          {order.customerId?.name || 'Customer'} · {order.deliveryAddress?.line1 || order.deliveryAddress?.postcode || ''}
        </p>

        <div className="flex gap-2">
          <button onClick={() => onAccept(order)} className="flex-1 py-2.5 rounded-xl bg-white text-brand-600 font-bold text-sm hover:bg-brand-50 transition-colors">
            ✓ Accept
          </button>
          <button onClick={() => onView(order)} className="flex-1 py-2.5 rounded-xl border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors">
            View Details
          </button>
          <button onClick={onDecline} className="px-4 py-2.5 rounded-xl border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors">
            ✗
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order timer ─────────────────────────────────────────────────────────────
function OrderTimer({ createdAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  const isLate = elapsed > 20 * 60;

  return (
    <span className={`text-xs font-mono font-bold ${isLate ? 'text-red-500 animate-pulse' : 'text-text-muted'}`}>
      {mins}:{secs}
    </span>
  );
}

// ─── Order Row ──────────────────────────────────────────────────────────────
function OrderRow({ order, onSelect }) {
  return (
    <div
      className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(order)}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm text-text-primary">#{order.orderId}</span>
            <StatusBadge status={order.status} />
            {order.autoAccepted && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200">
                Auto
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted truncate">
            {order.customerId?.name || 'Customer'} · {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {fmtPrice(order.total)}
          </p>
          {order.customerNote && (
            <p className="text-[11px] text-amber-600 mt-1 truncate">📝 {order.customerNote}</p>
          )}
        </div>
        <div className="text-right shrink-0 space-y-1">
          <OrderTimer createdAt={order.createdAt} />
          <p className="text-[11px] text-text-muted">{fmtTime(order.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Delivery tracking timeline ─────────────────────────────────────────────
function DeliveryTimeline({ timeline, status }) {
  const steps = [
    { key: 'PLACED',          label: 'Order Received',   desc: 'Order has been confirmed by the restaurant' },
    { key: 'ACCEPTED',        label: 'Order Accepted',   desc: 'Restaurant is getting ready' },
    { key: 'PREPARING',       label: 'Preparing Order',  desc: 'The restaurant is preparing your delicious meal' },
    { key: 'READY',           label: 'Ready for Pickup', desc: 'Your order is ready' },
    { key: 'DRIVER_ASSIGNED', label: 'Driver Assigned',  desc: 'A delivery partner has been assigned' },
    { key: 'ON_WAY',          label: 'Out for Delivery', desc: 'Your order is on its way to you' },
    { key: 'DELIVERED',       label: 'Delivered',         desc: 'Enjoy your meal!' },
  ];

  const statusOrder = ['PLACED','ACCEPTED','PREPARING','READY','DRIVER_ASSIGNED','ON_WAY','DELIVERED'];
  const currentIdx = statusOrder.indexOf(status);

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const tl = timeline?.find(t => t.status === step.key);
        const isDone = statusOrder.indexOf(step.key) <= currentIdx;
        const isCurrent = step.key === status;

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
                ${isDone ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'}
                ${isCurrent ? 'ring-2 ring-brand-300 ring-offset-2' : ''}`}>
                {isDone ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-0.5 h-8 ${isDone ? 'bg-brand-300' : 'bg-gray-200'}`} />
              )}
            </div>
            <div className="pb-4 pt-1">
              <p className={`text-sm font-semibold ${isDone ? 'text-text-primary' : 'text-text-muted'}`}>
                {step.label}
              </p>
              <p className="text-xs text-text-muted">{step.desc}</p>
              {tl?.timestamp && (
                <p className="text-[11px] text-brand-500 mt-0.5">{fmtTime(tl.timestamp)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Prep Time Selector ─────────────────────────────────────────────────────
function PrepTimeSelector({ defaultTime, onSelect }) {
  const times = [10, 15, 20, 25, 30, 40, 50, 60];
  const [selected, setSelected] = useState(defaultTime || 25);
  const [custom, setCustom] = useState('');

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-text-primary">Estimated Prep Time</p>
      <div className="flex flex-wrap gap-2">
        {times.map(t => (
          <button key={t} onClick={() => { setSelected(t); setCustom(''); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${selected === t && !custom ? 'bg-brand-500 text-white' : 'bg-bg-section border border-border text-text-secondary hover:border-brand-300'}`}>
            {t} min
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="number" min="1" max="180" placeholder="Custom mins"
          value={custom} onChange={e => { setCustom(e.target.value); setSelected(Number(e.target.value) || 25); }}
          className="flex-1 px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-brand-400 bg-white" />
      </div>
      <button onClick={() => onSelect(custom ? Number(custom) : selected)}
        className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors">
        Accept Order ({custom || selected} min)
      </button>
    </div>
  );
}

// ─── Reject Modal ───────────────────────────────────────────────────────────
function RejectModal({ order, onReject, onClose }) {
  const [reason, setReason] = useState('');
  const reasons = ['Item(s) unavailable', 'Kitchen is too busy', 'Restaurant closing soon', 'Cannot deliver to this area', 'Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-text-primary mb-1">Reject Order</h3>
        <p className="text-sm text-text-muted mb-4">#{order.orderId} · {fmtPrice(order.total)}</p>

        <div className="space-y-2 mb-4">
          {reasons.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors
                ${reason === r ? 'bg-red-50 border-2 border-red-300 text-red-700 font-semibold' : 'bg-bg-section border border-border text-text-secondary hover:border-red-200'}`}>
              {r}
            </button>
          ))}
        </div>

        {reason === 'Other' && (
          <textarea placeholder="Enter reason..." value={reason === 'Other' ? '' : reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border text-sm mb-4 focus:outline-none focus:border-brand-400 resize-none h-20" />
        )}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary font-semibold text-sm hover:bg-bg-section">
            Cancel
          </button>
          <button onClick={() => onReject(reason)} disabled={!reason}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50 transition-colors">
            Reject Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail Panel ─────────────────────────────────────────────────────
function OrderDetailPanel({ order, onClose, onAction, settings }) {
  const [showReject, setShowReject] = useState(false);
  const [showAccept, setShowAccept] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const s = order.status;
  const customer = order.customerId || {};
  const driver = order.driverId || null;

  async function handleAction(action, data = {}) {
    setLoading(true);
    try {
      await onAction(order._id, action, data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showReject && (
        <RejectModal order={order}
          onReject={async (reason) => { await handleAction('reject', { reason }); setShowReject(false); }}
          onClose={() => setShowReject(false)} />
      )}

      <div className="fixed inset-0 z-40 flex" onClick={onClose}>
        <div className="flex-1" /> {/* clickaway overlay */}
        <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl border-l border-border"
          onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-brand-500 text-white px-6 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold">Order #{order.orderId}</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors text-sm">✕</button>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={s} />
              {order.autoAccepted && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Auto-accepted</span>}
              <span className="text-xs opacity-80 ml-auto">{fmtDate(order.createdAt)} {fmtTime(order.createdAt)}</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Accept/Reject for new orders */}
            {s === 'PLACED' && !showAccept && (
              <div className="flex gap-2">
                <button onClick={() => setShowAccept(true)} disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors">
                  ✓ Accept Order
                </button>
                <button onClick={() => setShowReject(true)} disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50 transition-colors">
                  ✗ Reject
                </button>
              </div>
            )}

            {/* Prep time selector */}
            {s === 'PLACED' && showAccept && (
              <PrepTimeSelector defaultTime={settings?.defaultPrepTime || 25}
                onSelect={(time) => { handleAction('accept', { prepTime: time }); setShowAccept(false); }} />
            )}

            {/* Status progression */}
            {s === 'ACCEPTED' && (
              <button onClick={() => handleAction('status', { status: 'PREPARING' })} disabled={loading}
                className="w-full py-3 rounded-xl bg-yellow-500 text-white font-bold text-sm hover:bg-yellow-600 disabled:opacity-50 transition-colors">
                🍳 Start Preparing
              </button>
            )}
            {s === 'PREPARING' && (
              <button onClick={() => handleAction('status', { status: 'READY' })} disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors">
                ✅ Mark Ready for Pickup
              </button>
            )}
            {s === 'READY' && (
              <div className="space-y-2">
                <button onClick={() => handleAction('status', { status: 'ON_WAY' })} disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                  🛵 Hand Over to Driver
                </button>
                <button onClick={() => handleAction('mark-delivered', {})} disabled={loading}
                  className="w-full py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 disabled:opacity-50 transition-colors">
                  ✅ Mark as Delivered
                </button>
              </div>
            )}
            {(s === 'ON_WAY' || s === 'DRIVER_ASSIGNED') && (
              <button onClick={() => handleAction('mark-delivered', {})} disabled={loading}
                className="w-full py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 disabled:opacity-50 transition-colors">
                ✅ Mark as Delivered
              </button>
            )}

            {/* Customer info */}
            <div>
              <h3 className="text-sm font-bold text-brand-600 mb-2 flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Customer Information
              </h3>
              <div className="bg-bg-section rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <div>
                    <p className="text-[11px] text-text-muted">Name</p>
                    <p className="text-sm font-semibold text-text-primary">{customer.name || 'Customer'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-text-muted">Phone</p>
                    <p className="text-sm font-semibold text-text-primary">{customer.phone || '—'}</p>
                  </div>
                </div>
                {order.deliveryAddress && (
                  <div>
                    <p className="text-[11px] text-text-muted">Delivery Address</p>
                    <p className="text-sm text-text-primary">
                      {[order.deliveryAddress.line1, order.deliveryAddress.city, order.deliveryAddress.postcode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order items */}
            <div>
              <h3 className="text-sm font-bold text-brand-600 mb-2 flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                Order Items
              </h3>
              <div className="bg-bg-section rounded-xl p-4 space-y-2">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.quantity}× {item.name}</span>
                      {item.selectedToppings?.length > 0 && (
                        <p className="text-[11px] text-text-muted ml-4">
                          {item.selectedToppings.map(t => t.optionName).join(', ')}
                        </p>
                      )}
                      {item.note && <p className="text-[11px] text-amber-600 ml-4">Note: {item.note}</p>}
                    </div>
                    <span className="text-text-muted font-medium">{fmtPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer note */}
            {order.customerNote && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-1">📝 Customer Note</p>
                <p className="text-sm text-amber-800">{order.customerNote}</p>
              </div>
            )}

            {/* Summary */}
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-2">Summary</h3>
              <div className="bg-bg-section rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal ({order.items?.length} items)</span>
                  <span>{fmtPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{fmtPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-text-muted">
                  <span>VAT</span>
                  <span>{fmtPrice(order.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Delivery Fee</span>
                  <span>{fmtPrice(order.deliveryFee)}</span>
                </div>
                {order.tip > 0 && (
                  <div className="flex justify-between text-text-muted">
                    <span>Tip</span>
                    <span>{fmtPrice(order.tip)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-text-primary text-base">
                  <span>Total</span>
                  <span>{fmtPrice(order.total)}</span>
                </div>
                <div className="flex justify-between text-text-muted pt-1">
                  <span>Payment method</span>
                  <span className="font-medium text-text-primary">{order.paymentMethod || 'Card'}</span>
                </div>
              </div>
            </div>

            {/* Delivery tracking */}
            {!['CANCELLED','REJECTED','FAILED'].includes(s) && (
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-3">Delivery Tracking</h3>
                <DeliveryTimeline timeline={order.timeline} status={s} />
              </div>
            )}

            {/* Driver info */}
            {driver && (
              <div>
                <h3 className="text-sm font-bold text-text-primary mb-2">Delivery Partner</h3>
                <div className="bg-bg-section rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                    {driver.name?.[0]?.toUpperCase() || 'D'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">{driver.name}</p>
                    <p className="text-xs text-text-muted">{driver.vehicleType} · {driver.vehiclePlate || ''}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    On delivery
                  </span>
                </div>
              </div>
            )}

            {/* Print receipt */}
            <button onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl border-2 border-brand-300 text-brand-600 font-bold text-sm hover:bg-brand-50 transition-colors">
              🖨 Print Receipt
            </button>

            {/* Cancel (for non-terminal orders) */}
            {['PLACED','ACCEPTED','PREPARING','READY'].includes(s) && (
              <button onClick={() => handleAction('restaurant-cancel', { reason: 'Cancelled by restaurant' })} disabled={loading}
                className="w-full py-2.5 rounded-xl text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors">
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main LiveOrdersPage ────────────────────────────────────────────────────
export default function LiveOrdersPage() {
  const [orders,       setOrders]        = useState([]);
  const [tab,          setTab]           = useState('all');
  const [newOrderAlert,setNewOrderAlert] = useState(null);
  const [loading,      setLoading]       = useState(true);
  const [selectedOrder,setSelectedOrder] = useState(null);
  const [settings,     setSettings]      = useState({});

  // Load active orders
  useEffect(() => {
    api.get('/orders/restaurant/active')
      .then(r => {
        setOrders(r.data.orders || []);
        if (r.data.settings) setSettings(r.data.settings);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Socket for real-time
  useEffect(() => {
    const socket = connectRestaurantSocket();

    socket.on('new:order', order => {
      // Check if it's a status update or a genuinely new order
      if (order._updateType === 'status_change') {
        setOrders(prev => prev.map(o => o._id === order._id ? { ...order } : o));
        // Also update selected order if viewing
        setSelectedOrder(prev => prev && prev._id === order._id ? { ...order } : prev);
        return;
      }
      setOrders(prev => {
        const exists = prev.find(o => o._id === order._id);
        if (exists) return prev.map(o => o._id === order._id ? order : o);
        return [order, ...prev];
      });
      setNewOrderAlert(order);
    });

    socket.on('order:status', ({ orderId, status, prepTime, autoAccepted, driverId, reason }) => {
      setOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          const updated = { ...o, status };
          if (prepTime) updated.prepTime = prepTime;
          if (autoAccepted) updated.autoAccepted = true;
          if (driverId) updated.driverId = driverId;
          return updated;
        }
        return o;
      }));
      // Update selected order
      setSelectedOrder(prev => {
        if (prev && prev._id === orderId) {
          const updated = { ...prev, status };
          if (prepTime) updated.prepTime = prepTime;
          if (autoAccepted) updated.autoAccepted = true;
          return updated;
        }
        return prev;
      });
    });

    return () => {
      socket.off('new:order');
      socket.off('order:status');
    };
  }, []);

  // Action handler
  const handleOrderAction = useCallback(async (orderId, action, data = {}) => {
    try {
      let res;
      if (action === 'accept') {
        res = await api.patch(`/orders/${orderId}/accept`, data);
      } else if (action === 'reject') {
        res = await api.patch(`/orders/${orderId}/reject`, data);
      } else if (action === 'status') {
        res = await api.patch(`/orders/${orderId}/status`, data);
      } else if (action === 'assign-driver') {
        res = await api.patch(`/orders/${orderId}/assign-driver`, data);
      } else if (action === 'mark-delivered') {
        res = await api.patch(`/orders/${orderId}/mark-delivered`, data);
      } else if (action === 'restaurant-cancel') {
        res = await api.patch(`/orders/${orderId}/restaurant-cancel`, data);
      }

      if (res?.data?.order) {
        const updated = res.data.order;
        setOrders(prev => prev.map(o => o._id === orderId ? updated : o));
        setSelectedOrder(prev => prev && prev._id === orderId ? updated : prev);

        // Remove from list if terminal
        if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(updated.status)) {
          setTimeout(() => {
            setOrders(prev => prev.filter(o => o._id !== orderId));
            setSelectedOrder(prev => prev && prev._id === orderId ? null : prev);
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Order action failed:', err);
    }
  }, []);

  async function handleQuickAccept(order) {
    setNewOrderAlert(null);
    await handleOrderAction(order._id, 'accept', { prepTime: settings.defaultPrepTime || 25 });
  }

  // Filtering
  const filtered = orders.filter(o => {
    const s = o.status;
    if (tab === 'all')        return true;
    if (tab === 'new')        return ['PLACED','PENDING'].includes(s);
    if (tab === 'preparing')  return ['ACCEPTED','PREPARING'].includes(s);
    if (tab === 'ready')      return s === 'READY';
    if (tab === 'on_way')     return ['DRIVER_ASSIGNED','ON_WAY'].includes(s);
    if (tab === 'completed')  return ['DELIVERED','CANCELLED','REJECTED'].includes(s);
    return true;
  });

  const tabLabels = {
    all: 'All', new: 'New', preparing: 'Preparing', ready: 'Ready',
    on_way: 'On the Way', completed: 'Completed',
  };

  const tabCounts = {
    new:       orders.filter(o => ['PLACED','PENDING'].includes(o.status)).length,
    preparing: orders.filter(o => ['ACCEPTED','PREPARING'].includes(o.status)).length,
    ready:     orders.filter(o => o.status === 'READY').length,
    on_way:    orders.filter(o => ['DRIVER_ASSIGNED','ON_WAY'].includes(o.status)).length,
    completed: orders.filter(o => ['DELIVERED','CANCELLED','REJECTED'].includes(o.status)).length,
  };

  return (
    <div className="min-h-screen bg-bg-page">
      {newOrderAlert && (
        <NewOrderAlert
          order={newOrderAlert}
          onAccept={handleQuickAccept}
          onDecline={() => setNewOrderAlert(null)}
          onView={(order) => { setNewOrderAlert(null); setSelectedOrder(order); }}
        />
      )}

      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAction={handleOrderAction}
          settings={settings}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Live Orders</h1>
            <p className="text-sm text-text-muted">Manage incoming and active orders</p>
          </div>
          {settings.autoAcceptOrders && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-700">Auto-accept ON ({settings.autoAcceptDelayMins || 2}m)</span>
            </div>
          )}
        </div>

        <StatBar orders={orders} />

        {/* Tab bar */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors
                ${tab === t ? 'bg-brand-500 text-white shadow' : 'bg-white border border-border text-text-muted hover:border-brand-300'}`}>
              {tabLabels[t]}
              {t !== 'all' && tabCounts[t] > 0 && (
                <span className={`ml-1.5 text-xs ${tab === t ? 'text-white/80' : 'text-text-muted'}`}>
                  ({tabCounts[t]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm">No orders in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <OrderRow key={order._id} order={order} onSelect={setSelectedOrder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
