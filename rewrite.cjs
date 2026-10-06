const fs = require('fs');
const content = fs.readFileSync('src/pages/admin/Users.jsx', 'utf8');

const startIndex = content.indexOf('const fetchEmployees =');
const endIndex = content.lastIndexOf('return (');

if (startIndex > -1 && endIndex > -1 && startIndex < endIndex) {
  const head = content.substring(0, startIndex);
  const tail = content.substring(endIndex);
  
  const replacement = `  const fetchEmployees = async (isInitial = true) => {
    if (isInitial) setLoading(true);
    try {
      const res = await api.get('/employees/?page_size=200');
      const rawEmployees = res.data?.data || (Array.isArray(res.data) ? res.data : (res.data?.results || []));

      // Map backend employees
      const backendMapped = rawEmployees
        .map((emp, idx) => {
          const u = emp.user || {};
          const fullName = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || \`Staff #\${u.id || emp.id}\`;
          
          const rawRoleName = (emp.employee_type || 'STAFF').toUpperCase();
          const displayRole = (rawRoleName === 'ADMIN' || rawRoleName === 'SUPER_ADMIN' || rawRoleName === 'RESTAURANT_MANAGER') ? 'admin' : 'employee';

          return {
            id: String(u.id || ''),
            employeeId: String(emp.id),
            employeeCode: emp.employee_code || \`EMP-\${100 + idx}\`,
            name: fullName,
            email: u.email || 'N/A',
            phone: u.phone || u.phone_number || 'N/A',
            role: displayRole,
            backendRole: rawRoleName,
            designation: emp.designation || (displayRole === 'admin' ? 'Restaurant Administrator' : 'Staff Associate'),
            department: emp.department || (displayRole === 'admin' ? 'Management' : 'Dining Floor'),
            joinedDate: emp.created_at ? new Date(emp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '2024'),
            isBackendUser: true
          };
        })
        .filter(Boolean);

      setEmployees(backendMapped);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setEmployees([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees(true);

    const handleSync = () => {
      fetchEmployees(false);
    };

    const handleStorage = (e) => {
      if (e.key === 'foodie_users_sync_trigger') {
        fetchEmployees(false);
      }
    };

    window.addEventListener('foodie_users_updated', handleSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('foodie_users_updated', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (selectedTab !== 'all') {
      result = result.filter(emp => {
        const dept = (emp.department || '').toLowerCase();
        if (selectedTab === 'kitchen') return dept.includes('kitchen') || dept.includes('chef');
        if (selectedTab === 'floor') return dept.includes('floor') || dept.includes('dining') || dept.includes('waiter');
        if (selectedTab === 'billing') return dept.includes('billing') || dept.includes('cashier');
        if (selectedTab === 'management') return dept.includes('management') || emp.role === 'admin';
        return true;
      });
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(emp =>
        (emp.name || '').toLowerCase().includes(term) ||
        (emp.email || '').toLowerCase().includes(term) ||
        (emp.phone || '').includes(term) ||
        (emp.designation || '').toLowerCase().includes(term)
      );
    }
    return result.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      return true;
    });
  }, [employees, selectedTab, search]);

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (
      !formData.name?.trim() ||
      !formData.email?.trim() ||
      !formData.role?.trim() ||
      !formData.designation?.trim() ||
      !formData.department?.trim() ||
      (!editingUser && !formData.password?.trim())
    ) {
      alert('Please fill in all mandatory fields (including Password for new employee).');
      return;
    }

    const cleanPhone = String(formData.phone || '').replace(/\\D/g, '').slice(0, 10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit phone number (cannot exceed or be less than 10 digits).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const targetUserId = editingUser.id;
        const targetEmpId = editingUser.employeeId;

        if (targetUserId && targetUserId !== 'undefined') {
          await api.patch(\`/users/users/\${targetUserId}/\`, {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: cleanPhone,
            phone_number: cleanPhone,
          }).catch(err => {
            return api.patch(\`/users/\${targetUserId}/\`, {
              name: formData.name.trim(),
              email: formData.email.trim(),
              phone: cleanPhone,
              phone_number: cleanPhone,
            });
          });
        }

        if (targetEmpId && targetEmpId !== 'undefined') {
          await api.patch(\`/employees/\${targetEmpId}/\`, {
            employee_type: formData.role.toUpperCase(),
            designation: formData.designation.trim(),
            department: formData.department.trim()
          });
        }
      } else {
        const userRes = await api.post('/users/users/', {
          name: formData.name.trim(),
          username: \`emp_\${cleanPhone}\`,
          email: formData.email.trim(),
          phone: cleanPhone,
          phone_number: cleanPhone,
          password: formData.password.trim(),
          is_active: true,
          is_staff: true,
        }).catch(err => {
          return api.post('/users/', {
            name: formData.name.trim(),
            username: \`emp_\${cleanPhone}\`,
            email: formData.email.trim(),
            phone: cleanPhone,
            phone_number: cleanPhone,
            password: formData.password.trim(),
            is_active: true,
            is_staff: true,
          });
        });

        const createdUser = userRes.data?.data || userRes.data;
        const newUserId = createdUser?.id;

        if (!newUserId) throw new Error("Backend did not return a valid User ID.");

        await api.post('/employees/', {
          user: newUserId,
          employee_type: formData.role.toUpperCase(),
          designation: formData.designation.trim(),
          department: formData.department.trim(),
          status: 'ACTIVE',
          is_active: true,
          restaurant: 1
        });
      }

      setIsAddModalOpen(false);
      resetForm();
      setEditingUser(null);
      await fetchEmployees(false);
      
      try {
        window.dispatchEvent(new CustomEvent('foodie_users_updated'));
        localStorage.setItem('foodie_users_sync_trigger', Date.now().toString());
      } catch (e) { }

      alert(editingUser ? 'Employee updated successfully!' : 'Employee added successfully!');
    } catch (err) {
      console.error('Failed to save employee:', err);
      const msg = typeof extractApiErrorMessage === 'function' ? extractApiErrorMessage(err, 'Failed to save employee.') : (err.response?.data?.detail || err.response?.data?.email?.[0] || err.message || 'Failed to save employee.');
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEmployee = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || user.phone_number || '',
      password: '',
      role: user.backendRole || 'STAFF',
      designation: user.designation || 'Staff',
      department: user.department || 'Dining Floor'
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteEmployee = async (userId) => {
    if (!window.confirm(\`Are you sure you want to remove this employee from the staff directory?\`)) {
      return;
    }

    const userObj = employees.find(e => e.id === userId || e.employeeId === userId);
    if (!userObj) return;

    try {
      if (userObj.employeeId && userObj.employeeId !== 'undefined') {
        await api.delete(\`/employees/\${userObj.employeeId}/\`);
      }
      if (userObj.id && userObj.id !== 'undefined') {
        await api.delete(\`/users/users/\${userObj.id}/\`).catch(() => api.delete(\`/users/\${userObj.id}/\`)).catch(()=>console.warn("Could not delete user"));
      }

      try {
        window.dispatchEvent(new CustomEvent('foodie_users_updated'));
        localStorage.setItem('foodie_users_sync_trigger', Date.now().toString());
      } catch (err) { }

      await fetchEmployees(false);
    } catch (err) {
      console.error("Delete employee failed:", err);
      const msg = typeof extractApiErrorMessage === 'function' ? extractApiErrorMessage(err, 'Failed to delete employee from backend.') : 'Failed to delete employee.';
      alert(msg);
    }
  };

`;
  
  fs.writeFileSync('src/pages/admin/Users.jsx', head + replacement + tail);
  console.log('Successfully rewrote Users.jsx');
} else {
  console.log('Failed to find indices', startIndex, endIndex);
}
