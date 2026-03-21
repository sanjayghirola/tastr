import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, pointerWithin, useDraggable, useDroppable } from '@dnd-kit/core';
import { connectRestaurantSocket } from '../../services/socket';
import api from '../../services/api';

const COLUMNS = [
  { key: 'new',       label: 'New Orders',        icon: '📥', color: 'bg-blue-50   border-blue-200', statuses: ['PLACED', 'PENDING'] },
  { key: 'preparing', label: 'Preparing',          icon: '🍳', color: 'bg-yellow-50 border-yellow-200', statuses: ['ACCEPTED', 'PREPARING'] },
  { key: 'ready',     label: 'Ready',              icon: '✅', color: 'bg-green-50  border-green-200', statuses: ['READY'] },
  { key: 'delivery',  label: 'Out for Delivery',   icon: '🛵', color: 'bg-purple-50 border-purple-200', statuses: ['DRIVER_ASSIGNED', 'ON_WAY'] },
];

// Map: which column key an order should move to → what API status to set
const COLUMN_TARGET_STATUS = {
  new:       'PLACED',
  preparing: 'PREPARING',
  ready:     'READY',
  delivery:  'ON_WAY',
};

// What status transitions are needed when dragging from current status → target column
function getStatusForDrop(currentStatus, targetColumnKey) {
  const transitions = {
    // From PLACED/PENDING → target column
    'PLACED->preparing':  'ACCEPTED',
    'PENDING->preparing': 'ACCEPTED',
    'PLACED->ready':      null, // can't skip
    'PENDING->ready':     null,

    // From ACCEPTED/PREPARING → target column
    'ACCEPTED->preparing':  'PREPARING',
    'PREPARING->ready':     'READY',
    'ACCEPTED->ready':      null, // would need 2 steps

    // From READY → target column
    'READY->delivery': 'ON_WAY',

    // From DRIVER_ASSIGNED → delivery (same col, advance)
    'DRIVER_ASSIGNED->delivery': 'ON_WAY',
  };

  const key = `${currentStatus}->${targetColumnKey}`;
  return transitions[key] || null;
}

function getNextAction(status) {
  const map = {
    PLACED:          { next: 'ACCEPTED',  label: 'Accept',           api: 'accept' },
    PENDING:         { next: 'ACCEPTED',  label: 'Accept',           api: 'accept' },
    ACCEPTED:        { next: 'PREPARING', label: 'Start Preparing',  api: 'status' },
    PREPARING:       { next: 'READY',     label: 'Mark Ready',       api: 'status' },
    READY:           { next: 'ON_WAY',    label: 'Hand Over',        api: 'status' },
    DRIVER_ASSIGNED: { next: 'ON_WAY',    label: 'Picked Up',        api: 'status' },
    ON_WAY:          { next: 'DELIVERED', label: 'Delivered',         api: 'mark-delivered' },
  };
  return map[status] || { next: 'DELIVERED', label: 'Complete', api: 'mark-delivered' };
}

function fmtPrice(p) { return `£${((p || 0) / 100).toFixed(2)}`; }

function findColumnForStatus(status) {
  return COLUMNS.find(c => c.statuses.includes(status))?.key || null;
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
  const isLate = elapsed > 15 * 60;

  return (
    <span className={`text-xs font-mono font-bold ${isLate ? 'text-red-500' : 'text-gray-500'}`}>
      {mins}:{secs}
    </span>
  );
}

// ─── Draggable Kitchen order card ────────────────────────────────────────────
function KitchenOrderCard({ order, onAction, isDragOverlay }) {
  const [expanded, setExpanded] = useState(false);
  const action = getNextAction(order.status);
  const isNew = ['PLACED', 'PENDING'].includes(order.status);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order._id,
    data: { order },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.3 : 1,
  } : undefined;

  const cardContent = (
    <>
      {/* Header */}
      <div className={`px-3 py-2 flex items-center justify-between ${isNew ? 'bg-brand-500' : 'bg-brand-400'}`}>
        <span className="text-white font-bold text-sm">#{order.orderId}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-xs">{fmtPrice(order.total)}</span>
          <OrderTimer createdAt={order.createdAt} />
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">{order.customerId?.name || 'Customer'}</p>
          {order.prepTime && (
            <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded-full font-medium">
              {order.prepTime}m prep
            </span>
          )}
        </div>

        {/* Items */}
        <div className="space-y-1 mb-2">
          {(expanded ? order.items : order.items?.slice(0, 3))?.map((item, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-700">
              <span className="font-medium">{item.quantity}× {item.name}</span>
              {item.selectedToppings?.length > 0 && (
                <span className="text-gray-400 text-[10px]">+extras</span>
              )}
            </div>
          ))}
          {!expanded && order.items?.length > 3 && (
            <button onClick={e => { e.stopPropagation(); setExpanded(true); }}
              className="text-[10px] text-brand-500 underline">
              +{order.items.length - 3} more
            </button>
          )}
          {expanded && order.items?.length > 3 && (
            <button onClick={e => { e.stopPropagation(); setExpanded(false); }}
              className="text-[10px] text-gray-400 underline">
              show less
            </button>
          )}
        </div>

        {order.customerNote && (
          <p className="text-[10px] bg-amber-50 text-amber-600 rounded-lg px-2 py-1 mb-2">
            📝 {order.customerNote}
          </p>
        )}

        {order.autoAccepted && (
          <p className="text-[10px] text-green-600 bg-green-50 rounded-lg px-2 py-0.5 mb-2 text-center font-medium">
            ⚡ Auto-accepted
          </p>
        )}

        {order.driverId && (
          <div className="text-[10px] bg-purple-50 rounded-lg px-2 py-1 mb-2 flex items-center gap-1">
            <span>🛵</span>
            <span className="font-medium text-purple-700">
              {typeof order.driverId === 'object' ? order.driverId.name : 'Driver assigned'}
            </span>
          </div>
        )}

        {/* Action buttons — only show if not a drag overlay */}
        {!isDragOverlay && (
          <div className="flex gap-1.5">
            {isNew && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); onAction(order._id, 'reject'); }}
                  className="flex-1 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onAction(order._id, 'accept'); }}
                  className="flex-[2] py-2 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-colors"
                >
                  Accept
                </button>
              </>
            )}
            {!isNew && (
              <button
                onClick={e => { e.stopPropagation(); onAction(order._id, action.api === 'status' ? action.next : action.api === 'mark-delivered' ? 'DELIVERED' : action.next); }}
                className="w-full py-2 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-colors"
              >
                {action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  if (isDragOverlay) {
    return (
      <div className="bg-white rounded-2xl border-2 border-brand-500 overflow-hidden shadow-2xl w-72 opacity-95">
        {cardContent}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl border border-[#E8D9C0] overflow-hidden shadow-sm touch-none
        ${isDragging ? 'ring-2 ring-brand-300' : 'cursor-grab active:cursor-grabbing'}`}
      {...attributes}
      {...listeners}
    >
      {cardContent}
    </div>
  );
}

// ─── Droppable Column ────────────────────────────────────────────────────────
function DroppableColumn({ column, orders, onAction, activeId }) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.key,
    data: { columnKey: column.key },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border-2 min-h-[28rem] overflow-hidden transition-all duration-200
        ${column.color}
        ${isOver ? 'ring-2 ring-brand-400 ring-offset-2 scale-[1.01]' : ''}`}
    >
      <div className="px-4 py-3 border-b border-current/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">{column.icon}</span>
          <h3 className="font-bold text-gray-700 text-sm">{column.label}</h3>
          <span className="ml-auto bg-white text-gray-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
            {orders.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {orders.map(order => (
          <KitchenOrderCard
            key={order._id}
            order={order}
            onAction={onAction}
          />
        ))}
        {orders.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-8 text-sm rounded-xl border-2 border-dashed transition-colors
            ${isOver ? 'border-brand-400 bg-brand-50 text-brand-500' : 'border-gray-200 text-gray-300'}`}>
            <span className="text-3xl mb-2 opacity-40">{isOver ? '⬇️' : '📭'}</span>
            <p>{isOver ? 'Drop here' : 'No orders here'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main KitchenDisplayPage ──────────────────────────────────────────────────
export default function KitchenDisplayPage() {
  const [orders,   setOrders]   = useState([]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    api.get('/orders/restaurant/active')
      .then(r => setOrders(r.data.orders || []))
      .catch(() => {});

    const socket = connectRestaurantSocket();
    socket.on('new:order', order => {
      if (order._updateType === 'status_change') {
        setOrders(prev => prev.map(o => o._id === order._id ? { ...order } : o));
        return;
      }
      setOrders(prev => {
        const exists = prev.find(o => o._id === order._id);
        if (exists) return prev.map(o => o._id === order._id ? order : o);
        return [order, ...prev];
      });
    });
    socket.on('order:status', ({ orderId, status, prepTime, autoAccepted, driverId }) => {
      setOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          const u = { ...o, status };
          if (prepTime) u.prepTime = prepTime;
          if (autoAccepted) u.autoAccepted = true;
          if (driverId) u.driverId = driverId;
          return u;
        }
        return o;
      }));
    });
    return () => {
      socket.off('new:order');
      socket.off('order:status');
    };
  }, []);

  async function handleAction(orderId, actionOrStatus) {
    try {
      let res;
      if (actionOrStatus === 'accept') {
        res = await api.patch(`/orders/${orderId}/accept`, { prepTime: 25 });
      } else if (actionOrStatus === 'reject') {
        res = await api.patch(`/orders/${orderId}/reject`, { reason: 'Rejected from kitchen' });
      } else if (actionOrStatus === 'DELIVERED') {
        res = await api.patch(`/orders/${orderId}/mark-delivered`, {});
      } else {
        res = await api.patch(`/orders/${orderId}/status`, { status: actionOrStatus });
      }

      if (res?.data?.order) {
        const updated = res.data.order;
        if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(updated.status)) {
          setTimeout(() => setOrders(prev => prev.filter(o => o._id !== orderId)), 1500);
        } else {
          setOrders(prev => prev.map(o => o._id === orderId ? updated : o));
        }
      }
    } catch (err) {
      console.error('Kitchen action failed:', err);
    }
  }

  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;

    const draggedOrder = orders.find(o => o._id === active.id);
    if (!draggedOrder) return;

    const targetColumnKey = over.id; // column key since we use useDroppable on columns
    const sourceColumnKey = findColumnForStatus(draggedOrder.status);

    // Dropped on same column → no-op
    if (sourceColumnKey === targetColumnKey) return;

    // Get the right status transition for this drop
    const targetStatus = getStatusForDrop(draggedOrder.status, targetColumnKey);
    if (!targetStatus) {
      console.warn(`Cannot move from ${draggedOrder.status} to column ${targetColumnKey}`);
      return;
    }

    // For PLACED/PENDING → preparing column, we need to call accept
    if (['PLACED', 'PENDING'].includes(draggedOrder.status) && targetColumnKey === 'preparing') {
      handleAction(active.id, 'accept');
    } else if (targetStatus === 'DELIVERED') {
      handleAction(active.id, 'DELIVERED');
    } else {
      handleAction(active.id, targetStatus);
    }
  }

  const columnOrders = COLUMNS.reduce((acc, col) => {
    acc[col.key] = orders.filter(o => col.statuses.includes(o.status));
    return acc;
  }, {});

  const activeOrder = activeId ? orders.find(o => o._id === activeId) : null;

  return (
    <div className="min-h-screen bg-bg-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Kitchen Display</h1>
            <p className="text-sm text-text-muted">Drag orders between columns or use action buttons</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live · {orders.length} active orders
          </div>
        </div>

        <DndContext
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-4 gap-4">
            {COLUMNS.map(col => (
              <DroppableColumn
                key={col.key}
                column={col}
                orders={columnOrders[col.key] || []}
                onAction={handleAction}
                activeId={activeId}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeOrder && (
              <KitchenOrderCard
                order={activeOrder}
                onAction={() => {}}
                isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
