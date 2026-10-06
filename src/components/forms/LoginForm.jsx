import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { validateEmail, validatePassword } from '../../utils/validators';

export const LoginForm = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = {};

    if (!validateEmail(email)) {
      validationErrors.email = 'Please enter a valid email address';
    }
    if (!validatePassword(password)) {
      validationErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setErrors({ form: err.message || 'Authentication failed' });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {errors.form && (
        <div className="alert alert-danger py-2 rounded-3 small text-center mb-3 border-0">
          {errors.form}
        </div>
      )}

      <Input
        label="Email Address"
        type="email"
        placeholder="yourname@domain.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErrors({});
        }}
        error={errors.email}
        required
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setErrors({});
        }}
        error={errors.password}
        required
      />

      <Button type="submit" variant="primary" loading={loading} className="w-100 mt-2 py-2.5">
        Login
      </Button>
    </form>
  );
};
export default LoginForm;
