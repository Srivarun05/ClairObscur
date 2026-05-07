import { io } from 'socket.io-client';
import { SERVER_BASE_URL } from './config';

let socket;

export const getSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (!socket) {
    socket = io(SERVER_BASE_URL, {
      autoConnect: false,
      auth: { token },
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
