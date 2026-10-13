import { io } from 'socket.io-client';

// Connect to backend server (http://localhost:5000)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  transports: ['polling', 'websocket'],
  withCredentials: true,
});

export const joinEventRoom = (eventId) => {
  if (!eventId) return;
  const idStr = eventId.toString();
  if (socket.connected) {
    socket.emit('joinEventRoom', idStr);
  }
};

export const leaveEventRoom = (eventId) => {
  if (!eventId) return;
  const idStr = eventId.toString();
  if (socket.connected) {
    socket.emit('leaveEventRoom', idStr);
  }
};

socket.on('connect', () => {
  console.log('[Socket.IO Client] Connected to backend on socket ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket.IO Client] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.warn('[Socket.IO Client] Connection error:', error.message);
});

export default socket;
