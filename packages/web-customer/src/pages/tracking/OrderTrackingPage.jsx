import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket, joinOrderRoom, leaveOrderRoom, getSocket } from '../../services/socket';
import api from '../../services/api';

// ─── Status milestones config ──────────────────────────────────────────────
const MILESTONES = [
  { key: 'pending',         label: 'Order Placed' },
  { key: 'placed',          label: 'Confirmed' },
  { key: 'accepted',        label: 'Accepted' },
  { key: 'preparing',       label: 'Preparing' },
  { key: 'driver_assigned', label: 'Driver Assigned' },
  { key: 'on_way',          label: 'On the Way' },
  { key: 'delivered',       label: 'Delivered' },
];

const STATUS_ORDER = MILESTONES.map(m => m.key);

function milestoneIndex(status) {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

// ─── Status milestone bar ──────────────────────────────────────────────────
function StatusMilestones({ status }) {
  const currentIdx = milestoneIndex(status);
  return (
    <div className="flex items-center justify-between px-2 py-4 overflow-x-auto">
      {MILESTONES.map((m, i) => {
        const done    = i < currentIdx;
        const active  = i === currentIdx;
        return (
          <div key={m.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${done   ? 'bg-[#C18B3C] text-white'
                  : active ? 'bg-[#C18B3C] text-white ring-4 ring-[#C18B3C]/30'
                           : 'bg-gray-200 text-gray-400'}`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap
                ${active ? 'text-[#C18B3C]' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                {m.label}
              </span>
            </div>
            {i < MILESTONES.length - 1 && (
              <div className={`h-0.5 w-6 mx-1 rounded transition-all
                ${i < currentIdx ? 'bg-[#C18B3C]' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ETA chip ──────────────────────────────────────────────────────────────
function ETAChip({ eta }) {
  if (!eta) return null;
  const mins = Math.ceil((eta.arrivalTs - Date.now()) / 60000);
  if (mins < 0) return null;
  const arrival = new Date(eta.arrivalTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="inline-flex items-center gap-2 bg-[#C18B3C] text-white px-4 py-2 rounded-full text-sm font-semibold shadow">
      <span>🕐</span>
      <span>Delivery expected by {arrival} ({mins} min)</span>
    </div>
  );
}

// ─── Driver info card ──────────────────────────────────────────────────────
function DriverInfoCard({ driver, orderId, onChatOpen }) {
  if (!driver) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8D9C0]">
        <p className="text-sm text-gray-400 text-center">Waiting for driver to be assigned…</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8D9C0]">
      <div className="flex items-center gap-3">
        <img
          src={driver.photo || '/avatar-placeholder.png'}
          alt={driver.name}
          className="w-14 h-14 rounded-full object-cover border-2 border-[#C18B3C]"
        />
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{driver.name}</p>
          <p className="text-xs text-gray-400">{driver.vehicle}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs text-gray-500">{driver.rating?.toFixed(1) || '4.8'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {driver.phone && (
            <a
              href={`tel:${driver.phone}`}
              className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors"
            >
              📞
            </a>
          )}
          <button
            onClick={onChatOpen}
            className="w-10 h-10 rounded-full bg-[#FAF0E0] border border-[#E8D9C0] flex items-center justify-center text-[#C18B3C] hover:bg-[#EDE0CC] transition-colors"
          >
            💬
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order details collapsible ─────────────────────────────────────────────
function OrderDetails({ order }) {
  const [open, setOpen] = useState(false);
  if (!order) return null;
  return (
    <div className="bg-white rounded-2xl border border-[#E8D9C0] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-700"
      >
        <span>📋 Order Details</span>
        <span className="text-[#C18B3C]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#E8D9C0]">
          <p className="text-xs text-gray-400 mt-2 mb-1">{order.restaurantId?.name || 'Restaurant'}</p>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span>{item.quantity}× {item.name}</span>
              <span className="text-gray-500">£{(item.subtotal / 100).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-[#E8D9C0] mt-2 pt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-[#C18B3C]">£{((order.total || 0) / 100).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live Map (Google Maps embed or static placeholder) ────────────────────
function LiveMap({ driverLocation, restaurantLocation, deliveryLocation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);

  useEffect(() => {
    // Load Google Maps dynamically
    if (!window.google && import.meta.env.VITE_GOOGLE_MAPS_KEY) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=geometry`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else if (window.google) {
      initMap();
    }
  }, []);

  function initMap() {
    if (!mapRef.current || mapInstance.current) return;
    const center = deliveryLocation || { lat: 51.5074, lng: -0.1278 };
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
      disableDefaultUI: true,
      zoomControl: true,
    });

    // Destination pin
    if (deliveryLocation) {
      new window.google.maps.Marker({
        position: deliveryLocation,
        map: mapInstance.current,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(32, 32),
        },
        title: 'Delivery address',
      });
    }

    // Restaurant pin
    if (restaurantLocation) {
      new window.google.maps.Marker({
        position: restaurantLocation,
        map: mapInstance.current,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(32, 32),
        },
        title: 'Restaurant',
      });
    }
  }

  // Update driver marker on location change
  useEffect(() => {
    if (!mapInstance.current || !window.google || !driverLocation) return;
    const pos = { lat: driverLocation.lat, lng: driverLocation.lng };
    if (driverMarker.current) {
      driverMarker.current.setPosition(pos);
    } else {
      driverMarker.current = new window.google.maps.Marker({
        position: pos,
        map: mapInstance.current,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#C18B3C',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          rotation: driverLocation.bearing || 0,
        },
        title: 'Driver',
      });
    }
    mapInstance.current.panTo(pos);
  }, [driverLocation]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-[#E8D9C0]" style={{ height: 280 }}>
      <div ref={mapRef} className="w-full h-full bg-[#EDE0CC]" />
      {!import.meta.env.VITE_GOOGLE_MAPS_KEY && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF7F2] text-gray-400 text-sm">
          <span className="text-4xl mb-2">🗺️</span>
          <p>Live map requires VITE_GOOGLE_MAPS_KEY</p>
          {driverLocation && (
            <p className="text-xs mt-1">
              Driver at {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chat drawer ───────────────────────────────────────────────────────────
function ChatDrawer({ orderId, open, onClose, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [typing, setTyping]     = useState(false);
  const endRef                  = useRef(null);

  useEffect(() => {
    if (!open || !orderId) return;
    // Load history
    api.get(`/chat/${orderId}/history`).then(r => setMessages(r.data.messages || [])).catch(() => {});

    const socket = getSocket();
    socket.on('chat:message', msg => {
      if (msg.orderId === orderId) {
        setMessages(prev => [...prev, msg]);
        // Mark read
        socket.emit('chat:read', { orderId });
      }
    });
    socket.on('chat:typing', ({ senderId, isTyping }) => {
      if (senderId !== currentUserId) setTyping(isTyping);
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:typing');
    };
  }, [open, orderId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function sendMessage() {
    if (!text.trim()) return;
    getSocket().emit('chat:message', { orderId, text });
    setText('');
  }

  function handleTyping(val) {
    setText(val);
    getSocket().emit('chat:typing', { orderId, isTyping: val.length > 0 });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAF7F2]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E8D9C0] shadow-sm">
        <button onClick={onClose} className="text-[#C18B3C] font-bold text-lg">←</button>
        <p className="font-semibold text-gray-800">Chat with Driver</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm
                ${isMine
                  ? 'bg-[#C18B3C] text-white rounded-br-sm'
                  : 'bg-white border border-[#E8D9C0] text-gray-700 rounded-bl-sm'}`}>
                {msg.text}
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E8D9C0] rounded-2xl rounded-bl-sm px-4 py-2">
              <div className="flex gap-1 items-center h-4">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-4 bg-white border-t border-[#E8D9C0]">
        <input
          value={text}
          onChange={e => handleTyping(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message…"
          className="flex-1 bg-[#FAF7F2] border border-[#E8D9C0] rounded-full px-4 py-2 text-sm outline-none focus:border-[#C18B3C]"
        />
        <button
          onClick={sendMessage}
          className="w-10 h-10 rounded-full bg-[#C18B3C] text-white flex items-center justify-center text-lg hover:bg-[#a97430] transition-colors"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

// ─── Main OrderTrackingPage ────────────────────────────────────────────────
export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const navigate    = useNavigate();

  const [order,          setOrder]          = useState(null);
  const [status,         setStatus]         = useState('pending');
  const [driver,         setDriver]         = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta,            setEta]            = useState(null);
  const [chatOpen,       setChatOpen]       = useState(false);
  const [loading,        setLoading]        = useState(true);

  // Load order data
  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then(r => {
        setOrder(r.data.order);
        setStatus(r.data.order?.status || 'pending');
        if (r.data.order?.driverId) setDriver(r.data.order.driverId);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load tracking data (last known location + ETA)
    api.get(`/tracking/${orderId}`)
      .then(r => {
        if (r.data.driverLocation) setDriverLocation(r.data.driverLocation);
        if (r.data.eta)            setEta(r.data.eta);
        if (r.data.driver)         setDriver(r.data.driver);
      })
      .catch(() => {});
  }, [orderId]);

  // Socket setup
  useEffect(() => {
    const socket = connectSocket();
    joinOrderRoom(orderId);

    socket.on('order:status', ({ status: s, driver: d, prepTime }) => {
      setStatus(s);
      if (d) setDriver(d);
      if (s === 'delivered') {
        setTimeout(() => navigate('/order-success', { state: { orderId, fromTracking: true } }), 2000);
      }
    });

    socket.on('tracking:update', ({ lat, lng, bearing, speed, eta: newEta }) => {
      setDriverLocation({ lat, lng, bearing, speed });
      if (newEta) setEta(newEta);
    });

    return () => {
      leaveOrderRoom(orderId);
      socket.off('order:status');
      socket.off('tracking:update');
    };
  }, [orderId]);

  const deliveryLocation = order?.deliveryAddress?.lat
    ? { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng }
    : null;

  const restaurantLocation = order?.restaurantId?.location?.coordinates
    ? { lat: order.restaurantId.location.coordinates[1], lng: order.restaurantId.location.coordinates[0] }
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C18B3C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#FAF7F2] pb-8">
        {/* Header */}
        <div className="bg-white border-b border-[#E8D9C0] px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="text-[#C18B3C] font-bold text-lg">←</button>
          <div>
            <p className="font-bold text-gray-800 text-sm">Tracking Order</p>
            <p className="text-xs text-gray-400">{order?.orderId || orderId}</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          {/* Live Map */}
          <LiveMap
            driverLocation={driverLocation}
            restaurantLocation={restaurantLocation}
            deliveryLocation={deliveryLocation}
          />

          {/* ETA chip */}
          <div className="flex justify-center">
            <ETAChip eta={eta} />
          </div>

          {/* Status milestones */}
          <div className="bg-white rounded-2xl border border-[#E8D9C0] px-2 overflow-x-auto">
            <StatusMilestones status={status} />
          </div>

          {/* Driver card */}
          <DriverInfoCard
            driver={driver}
            orderId={orderId}
            onChatOpen={() => setChatOpen(true)}
          />

          {/* Order details */}
          <OrderDetails order={order} />

          {/* Info note */}
          <p className="text-center text-xs text-gray-400 px-4">
            We'll notify you once your order is out for delivery
          </p>
        </div>
      </div>

      {/* Chat drawer */}
      <ChatDrawer
        orderId={orderId}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currentUserId={order?.customerId}
      />
    </>
  );
}
