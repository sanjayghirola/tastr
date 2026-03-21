import { useState, useEffect } from 'react';
import api from '../../services/api';

const STATUS_BADGE = {
  DELIVERED:  { label: 'Delivered',  bg: 'bg-green-100',  text: 'text-green-700'  },
  CANCELLED:  { label: 'Cancelled',  bg: 'bg-red-100',    text: 'text-red-700'    },
  REJECTED:   { label: 'Rejected',   bg: 'bg-red-100',    text: 'text-red-700'    },
};

function fmtPrice(p) { return `£${((p || 0) / 100).toFixed(2)}`; }

export default function OrderHistoryPage() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const [filter, setFilter]   = useState('all');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (filter !== 'all') params.status = filter;
    if (search) params.q = search;

    api.get('/orders/restaurant/history', { params })
      .then(r => {
        setOrders(r.data.orders || []);
        setTotal(r.data.pagination?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filter, search]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-text-primary mb-1">Order History</h1>
        <p className="text-sm text-text-muted mb-5">Past completed, cancelled and rejected orders</p>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-2">
            {['all','DELIVERED','CANCELLED','REJECTED'].map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                  ${filter === f ? 'bg-brand-500 text-white' : 'bg-white border border-border text-text-muted hover:border-brand-300'}`}>
                {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search order ID..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 max-w-xs px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-brand-400 bg-white" />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-section">
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Order</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Items</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-muted">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const s = STATUS_BADGE[o.status] || { label: o.status, bg: 'bg-gray-100', text: 'text-gray-600' };
                  return (
                    <tr key={o._id} className="border-b border-border last:border-0 hover:bg-bg-section transition-colors">
                      <td className="px-4 py-3 font-bold text-text-primary">#{o.orderId}</td>
                      <td className="px-4 py-3 text-text-secondary">{o.customerId?.name || '—'}</td>
                      <td className="px-4 py-3 text-text-muted">{o.items?.length} items</td>
                      <td className="px-4 py-3 font-semibold text-text-primary">{fmtPrice(o.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-text-muted">Showing {(page-1)*20+1}–{Math.min(page*20, total)} of {total}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    className="px-3 py-1 rounded-lg text-xs font-semibold border border-border text-text-muted hover:bg-bg-section disabled:opacity-40">
                    ← Prev
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                    className="px-3 py-1 rounded-lg text-xs font-semibold border border-border text-text-muted hover:bg-bg-section disabled:opacity-40">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
