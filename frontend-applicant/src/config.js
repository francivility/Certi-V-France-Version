const envBase = import.meta.env.VITE_QR_BRIDGE_BASE_URL?.trim();

export const QR_BRIDGE_BASE_URL = envBase || `http://${window.location.hostname}:8000`;

export const qrBridgeUrl = (code) => `${QR_BRIDGE_BASE_URL}/qr/${code}`;

export const verificationBridgeUrl = (code) => `${QR_BRIDGE_BASE_URL}/v/${code}`;