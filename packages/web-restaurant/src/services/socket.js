import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
let socket = null;

export function getRestaurantSocket() {
  if (!socket) {
    const token = localStorage.getItem('tastr_restaurant_token');
    socket = io(`${BASE_URL}/restaurant`, {
      auth: { token },
      query: { restaurantId: localStorage.getItem('tastr_restaurant_id') },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectRestaurantSocket() {
  const s = getRestaurantSocket();
  if (!s.connected) s.connect();
  return s;
}
