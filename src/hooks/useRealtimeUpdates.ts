import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import type { WsEvents } from '@c3/shared';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = getSocket();

    s.on('agent.status', (_data: WsEvents['agent.status']) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    });

    s.on('task.updated', (_data: WsEvents['task.updated']) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    });

    s.on('message.sent', (_data: WsEvents['message.sent']) => {
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    });

    return () => {
      s.off('agent.status');
      s.off('task.updated');
      s.off('message.sent');
    };
  }, [queryClient]);
}
