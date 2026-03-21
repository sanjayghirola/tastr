import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token = localStorage.getItem('tastr_token');
    socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

export function joinOrderRoom(orderId) {
  const s = getSocket();
  s.emit('join:order', { orderId });
}

export function leaveOrderRoom(orderId) {
  const s = getSocket();
  s.emit('leave:order', { orderId });
}
