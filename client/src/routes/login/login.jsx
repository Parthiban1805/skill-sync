import axios from 'axios';
import sodium from 'libsodium-wrappers';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App'; // Update this import path as needed
import './login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [cryptoKey, setCryptoKey] = useState(null);
  const { updateUser } = useAuth();

  const SECRET_KEY = import.meta.env.VITE_SECRET_KEY;
  
  useEffect(() => {
    const initializeSodium = async () => {
      await sodium.ready;
      if (SECRET_KEY) {
        setCryptoKey(sodium.from_base64(SECRET_KEY));
      } else {
        console.error("❌ Secret key is missing! Check .env file.");
      }
    };
    initializeSodium();
  }, []);

  const encryptToken = (token) => {
    if (!cryptoKey) {
      console.error("❌ Encryption key is not initialized.");
      return null;
    }
    try {
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
      const encrypted = sodium.crypto_secretbox_easy(
        new TextEncoder().encode(token),
        nonce,
        cryptoKey
      );
      return {
        encrypted: sodium.to_base64(encrypted),
        nonce: sodium.to_base64(nonce),
      };
    } catch (error) {
      console.error("❌ Error during encryption:", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post('http://localhost:5001/skill-sync/login', { email, password });
      const token = res.data.token;
      const encryptedToken = encryptToken(token);
      if (!encryptedToken) {
        setMessage("❌ Encryption failed.");
        setLoading(false);
        return;
      }
      sessionStorage.setItem('token', JSON.stringify(encryptedToken));

      let decodedToken;
      try {
        const payloadBase64 = token.split('.')[1];
        decodedToken = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      } catch (err) {
        console.error("❌ Failed to decode JWT:", err);
        setMessage("Invalid token received.");
        setLoading(false);
        return;
      }

      const userRole = decodedToken?.role || "unknown";
      console.log(userRole);
      
      // Update user state in context before navigation
      if (decodedToken?.userDetails) {
        updateUser(decodedToken.userDetails);
      }
      
      switch (userRole) {
        case 'Student':
          navigate('/dashboard');
          break;
        case 'admin':
          navigate('/admin-dashboard');
          break;
        default:
          setMessage('Unknown role. Please contact support.');
      }
    } catch (err) {
      console.log('Error in login:', err);
      setMessage('Login failed: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Sign in to continue</h2>
        
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="input-label">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="name@yourorganization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="helper-text">Use email provided by your organization</div>
          </div>
          
          <div>
            <label htmlFor="password" className="input-label">Password</label>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="checkbox-wrapper">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={togglePasswordVisibility}
                className="checkbox-input"
              />
              <span className="checkbox-text">Show password</span>
            </label>
          </div>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Continue'}
          </button>
        </form>
        
        {message && (
          <div className={message.includes('❌') ? 'message error-message' : 'message'}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;