import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import SignupForm from '../../components/forms/SignupForm';

export const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleSignupSuccess = async (name, email, phone, password) => {
    await signup(name, email, phone, password);
    navigate('/customer/home');
  };

  return (
    <div className="mobile-wrapper min-vh-100 bg-white px-4 py-5 d-flex flex-column justify-content-center mx-auto">
      <div className="text-center mb-5">
        <h2 className="fw-bold text-danger">Foodie</h2>
        <p className="text-muted small">Create your account</p>
      </div>

      <div className="card border-0 shadow-sm p-4 rounded-4 bg-light-subtle">
        <SignupForm onSignup={handleSignupSuccess} />
      </div>

      <div className="text-center mt-4 small text-secondary">
        Already have an account?{' '}
        <Link to="/login" className="text-danger fw-bold text-decoration-none">
          Log In
        </Link>
      </div>
    </div>
  );
};
export default Signup;
