import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    
    if (success) {
      navigate('/home');
    } else {
      alert('Mock Login failed. Please try again.');
    }
  };

  return (
    <div className="container py-5 d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div className="card shadow-lg border-0 p-4 p-md-5 bg-white" style={{ maxWidth: '420px', borderRadius: '24px', width: '100%' }}>
        
        {/* Header */}
        <div className="text-center mb-4">
          <i className="bi bi-fast-food-fill" style={{ color: 'var(--primary-color)', fontSize: '48px' }}></i>
          <h3 className="fw-bold mt-2 text-dark">Welcome Back!</h3>
          <p className="text-muted small">Sign in to start ordering your favorite meals.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Input
            label="Email Address"
            placeholder="Enter your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            required
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordError}
            required
          />

          <div className="text-end mb-3">
            <a href="#" className="small text-danger fw-semibold text-decoration-none">
              Forgot Password?
            </a>
          </div>

          <div className="d-grid gap-2">
            <Button type="submit" variant="primary" loading={loading} className="py-2.5">
              Sign In
            </Button>
          </div>
        </form>

        <div className="text-center mt-4">
          <span className="text-muted small">Demo Login: Use any email and 6+ char password.</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
