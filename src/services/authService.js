import api, { setTokens, clearTokens } from './api';

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login/', { email, password });
      const data = response.data?.data || response.data;

      
      if (data.access) {
        setTokens(data.access, data.refresh);
      }
      
      const userObj = data.user;
      let role = 'customer';
      if (userObj && userObj.employee) {
        if (userObj.employee.employee_type === 'SUPER_ADMIN' || userObj.employee.employee_type === 'ADMIN') {
          role = 'admin';
        } else {
          role = 'employee';
        }
      }
      return { ...userObj, role };
    } catch (error) {
      const msg = error.response?.data?.non_field_errors?.[0] || error.response?.data?.detail || error.message;
      throw new Error(msg);
    }
  },

  signup: async (name, email, phone) => {
    try {
      const response = await api.post('/auth/register/', {
        name,
        email,
        phone,
        password: 'Password123!', // Default password for newly registered users via OTP flow
        password_confirm: 'Password123!'
      });
      const u = response.data?.data || response.data; return { ...u, role: 'customer' };
    } catch (error) {
      throw error;
    }
  },

  sendOTP: async (phone) => {
    // Mock OTP for now as the backend doesn't seem to have a dedicated /auth/send-otp/
    return { success: true };
  },

  verifyOTP: async (phone, otp) => {
    // Check if it's any 6 digit number or the old 1234
    const isValidOtp = (otp && otp.length === 6 && /^\d+$/.test(otp)) || otp === '1234';
    
    if (isValidOtp) {
      try {
        // Try login using the default password
        const userObj = await authService.login(`${phone}@foodie.com`, 'Password123!');
        return userObj;
      } catch (e) {
        // If login fails, try to register
        const res = await authService.signup(`User ${phone}`, `${phone}@foodie.com`, phone);
        const userObj = await authService.login(`${phone}@foodie.com`, 'Password123!');
        return userObj;
      }
    }
    throw new Error('Please enter a valid 6-digit OTP code.');
  },

  logout: () => {
    clearTokens();
    return Promise.resolve();
  }
};
