import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

/**
 * LiveMapPanel — uses Leaflet (CDN) to show active drivers and orders on a map.
 * Included in the Admin Dashboard page.
 */
export default function LiveMapPanel() {
  const mapRef     = useRef(null);
  const mapInstance = useRef(null);
  const markersRef  = useRef({});
  const [drivers,   setDrivers]   = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  // Load Leaflet from CDN
  useEffect(() => {
    if (window.L) { initMap(); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      // Cleanup map on unmount
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  function initMap() {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = window.L.map(mapRef.current, {
      center: [51.5074, -0.1278],
      zoom: 12,
      zoomControl: true,
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstance.current);

    fetchData();
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [driverRes, orderRes] = await Promise.all([
        api.get('/admin/drivers?status=online&limit=100'),
        api.get('/admin/orders?status=on_way&limit=100'),
      ]);
      setDrivers(driverRes.data.drivers || []);
      setOrders(orderRes.data.orders   || []);
      plotMarkers(driverRes.data.drivers || [], orderRes.data.orders || []);
    } catch {
      setDrivers([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  function plotMarkers(driversData, ordersData) {
    if (!mapInstance.current || !window.L) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    const STATUS_COLORS = {
      placed:          '#3b82f6',
      accepted:        '#f59e0b',
      preparing:       '#eab308',
      driver_assigned: '#8b5cf6',
      on_way:          '#6366f1',
    };

    // Driver markers (amber bike icon)
    driversData.forEach(driver => {
      const loc = driver.lastLocation;
      if (!loc?.lat) return;
      const icon = window.L.divIcon({
        html: `<div style="
          background:#C18B3C;color:white;border-radius:50%;
          width:32px;height:32px;display:flex;align-items:center;
          justify-content:center;font-size:16px;border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3)">🛵</div>`,
        iconSize: [32, 32],
        className: '',
      });
      const marker = window.L.marker([loc.lat, loc.lng], { icon })
        .addTo(mapInstance.current)
        .bindPopup(`<b>${driver.name}</b><br>⭐ ${driver.rating?.toFixed(1) || '—'}`);
      markersRef.current[`driver-${driver._id}`] = marker;
    });

    // Order destination markers
    ordersData.forEach(order => {
      const addr = order.deliveryAddress;
      if (!addr?.lat) return;
      const color = STATUS_COLORS[order.status] || '#6b7280';
      const icon = window.L.divIcon({
        html: `<div style="
          background:${color};color:white;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);width:24px;height:24px;
          border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        className: '',
      });
      const marker = window.L.marker([addr.lat, addr.lng], { icon })
        .addTo(mapInstance.current)
        .bindPopup(`<b>#${order.orderId}</b><br>${order.status?.replace(/_/g, ' ')}<br>${order.customerId?.name || ''}`);
      markersRef.current[`order-${order._id}`] = marker;
    });
  }

  const STATUS_LEGEND = [
    { color: '#C18B3C', label: 'Driver (online)' },
    { color: '#3b82f6', label: 'Order placed' },
    { color: '#f59e0b', label: 'Accepted' },
    { color: '#8b5cf6', label: 'Driver assigned' },
    { color: '#6366f1', label: 'On the way' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E8D9C0] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8D9C0]">
        <div>
          <h3 className="font-bold text-gray-700">Live Map</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {drivers.length} driver{drivers.length !== 1 ? 's' : ''} online · {orders.length} active order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <button
            onClick={fetchData}
            className="text-xs text-[#C18B3C] border border-[#E8D9C0] px-3 py-1.5 rounded-xl hover:bg-[#FAF0E0]"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Map container */}
      <div ref={mapRef} style={{ height: 420 }} className="w-full bg-[#EDE0CC]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#FAF7F2]/80 z-10">
            <div className="w-6 h-6 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-5 py-3 border-t border-[#E8D9C0] flex-wrap">
        {STATUS_LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
            <span className="text-xs text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
