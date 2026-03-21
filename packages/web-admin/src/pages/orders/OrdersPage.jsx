import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const STATUS_COLORS = {
  pending:         'bg-blue-100 text-blue-700',
  placed:          'bg-blue-100 text-blue-700',
  accepted:        'bg-amber-100 text-amber-700',
  preparing:       'bg-yellow-100 text-yellow-700',
  driver_assigned: 'bg-purple-100 text-purple-700',
  on_way:          'bg-indigo-100 text-indigo-700',
  delivered:       'bg-green-100 text-green-700',
  cancelled:       'bg-red-100 text-red-700',
  failed:          'bg-red-100 text-red-700',
};

const TYPE_LABELS = {
  standard: 'Standard',
  scheduled: 'Scheduled',
  gift: 'Gift',
  group: 'Group',
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [filters,   setFilters]   = useState({ status: '', dateFrom: '', dateTo: '', search: '' });
  const limit = 20;

  useEffect(() => {
    fetchOrders();
  }, [page, filters]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (filters.status)   params.set('status',   filters.status);
      if (filters.dateFrom) params.set('dateFrom',  filters.dateFrom);
      if (filters.dateTo)   params.set('dateTo',    filters.dateTo);
      if (filters.search)   params.set('search',    filters.search);

      const r = await api.get(`/admin/orders?${params}`);
      setOrders(r.data.orders || []);
      setTotal(r.data.total  || 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key, val) {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Orders</h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E8D9C0] p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <input
            type="text"
            placeholder="Order #, customer…"
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C18B3C] w-48"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={e => updateFilter('status', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C18B3C]"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C18B3C]" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#C18B3C]" />
        </div>
        <button
          onClick={() => { setFilters({ status: '', dateFrom: '', dateTo: '', search: '' }); setPage(1); }}
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E8D9C0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8D9C0] bg-[#FAF7F2]">
                {['Order #', 'Customer', 'Restaurant', 'Driver', 'Items', 'Amount', 'Status', 'Type', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No orders found</td></tr>
              ) : orders.map(order => (
                <tr
                  key={order._id}
                  className="border-b border-[#E8D9C0] hover:bg-[#FAF7F2] cursor-pointer transition-colors"
                  onClick={() => navigate(`/orders/${order._id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#C18B3C] font-semibold">{order.orderId}</td>
                  <td className="px-4 py-3 text-gray-700">{order.customerId?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{order.restaurantId?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{order.driverId?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{order.items?.length || 0}</td>
                  <td className="px-4 py-3 font-semibold">£{((order.total || 0) / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[order.type] || order.type}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[#C18B3C] text-xs">View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8D9C0]">
            <p className="text-xs text-gray-400">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
