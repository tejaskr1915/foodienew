import React, { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { validateEmail, validatePassword } from '../../utils/validators';

export const SignupForm = ({ onSignup }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = {};

    if (!name.trim()) {
      validationErrors.name = 'Name is required';
    }
    if (!validateEmail(email)) {
      validationErrors.email = 'Please enter a valid email address';
    }
    if (phone.length < 10) {
      validationErrors.phone = 'Please enter a valid phone number';
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
      await onSignup(name, email, phone, password);
    } catch (err) {
      setErrors({ form: err.message || 'Registration failed' });
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
        label="Full Name"
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setErrors({});
        }}
        error={errors.name}
        required
      />

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
        label="Phone Number"
        type="tel"
        inputMode="numeric"
        placeholder="e.g. 9876543210"
        maxLength={10}
        value={phone}
        onKeyDown={(e) => {
          if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) || e.ctrlKey || e.metaKey) {
            return;
          }
          if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            return;
          }
          const start = e.target.selectionStart ?? 0;
          const end = e.target.selectionEnd ?? 0;
          if (start === end && String(phone || '').length >= 10) {
            e.preventDefault();
          }
        }}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
          setPhone(val);
          setErrors({});
        }}
        error={errors.phone}
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
        Register Account
      </Button>
    </form>
  );
};
export default SignupForm;
