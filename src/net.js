import { useCallback, useEffect, useRef, useState } from "react";

const wsUrl = () => {
  const u = new URL("ws", window.location.href);
  u.hash = "";
  u.search = "";
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString();
};

// Conexión con reconexión automática. hello() da el primer mensaje al conectar.
export function useSocket(hello, onMessage, enabled = true) {
  const [status, setStatus] = useState("connecting");
  const wsRef = useRef(null);
  const helloRef = useRef(hello);
  const msgRef = useRef(onMessage);
  helloRef.current = hello;
  msgRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;
    let stop = false, retry = 0, timer = 0;
    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        setStatus("online");
        ws.send(JSON.stringify(helloRef.current()));
      };
      ws.onmessage = (e) => {
        try {
          msgRef.current(JSON.parse(e.data));
        } catch {
          /* mensaje inválido */
        }
      };
      ws.onclose = () => {
        if (stop) return;
        setStatus("offline");
        timer = setTimeout(connect, Math.min(5000, 500 * 2 ** retry++));
      };
    };
    connect();
    return () => {
      stop = true;
      clearTimeout(timer);
      wsRef.current && wsRef.current.close();
    };
  }, [enabled]);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
  }, []);
  return { status, send };
}

export const store = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
    } catch {
      /* sin almacenamiento */
    }
  },
};
