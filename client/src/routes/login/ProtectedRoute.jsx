import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import sodium from 'libsodium-wrappers';

const SECRET_KEY = import.meta.env.VITE_SECRET_KEY; // ✅ Load Secret Key

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const decryptToken = async () => {
    await sodium.ready;
    const encryptedData = sessionStorage.getItem('token');
    if (!encryptedData) {
      setLoading(false);
      return;
    }

    try {
      const { encrypted, nonce } = JSON.parse(encryptedData);
      const cryptoKey = sodium.from_base64(SECRET_KEY);

      const decrypted = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(encrypted),
        sodium.from_base64(nonce),
        cryptoKey
      );

      const token = new TextDecoder().decode(decrypted);
      const payloadBase64 = token.split('.')[1];
      const decodedPayload = JSON.parse(
        atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
      );

      console.log("Decoded Role:", decodedPayload.role);
      setRole(decodedPayload.role || null); // Update state
    } catch (error) {
      console.error("❌ Token decryption failed:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    decryptToken();
  }, []);

  // If still loading, you can show a spinner or placeholder
  if (loading) {
    return <div>Loading...</div>;
  }

  // Check role after state update
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
