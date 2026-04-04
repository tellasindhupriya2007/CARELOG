import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthContext } from './AuthContext';
import { initSocket, disconnectSocket, getSocket, onPresenceUpdate } from '../services/socketService';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { user, role } = useAuthContext();
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [connectionError, setConnectionError] = useState(null);

    useEffect(() => {
        if (!user?.uid) {
            disconnectSocket();
            setIsConnected(false);
            return;
        }

        // Initialize and join socket room
        const sock = initSocket({
            userId: user.uid,
            role: role || 'user',
            name: user.displayName || user.email || user.uid,
        });

        if (!sock) return;

        const onConnect = () => {
            setIsConnected(true);
            setConnectionError(null);
        };
        const onDisconnect = () => setIsConnected(false);
        const onError = (err) => {
            setConnectionError(err.message);
            setIsConnected(false);
        };

        sock.on('connect', onConnect);
        sock.on('disconnect', onDisconnect);
        sock.on('connect_error', onError);
        if (sock.connected) setIsConnected(true);

        // Presence updates
        const unsubPresence = onPresenceUpdate(({ onlineUsers: ou }) => setOnlineUsers(ou || []));

        return () => {
            sock.off('connect', onConnect);
            sock.off('disconnect', onDisconnect);
            sock.off('connect_error', onError);
            unsubPresence();
        };
    }, [user?.uid, role]);

    return (
        <SocketContext.Provider value={{ isConnected, onlineUsers, connectionError, socket: getSocket() }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}
