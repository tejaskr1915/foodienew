const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/Users.jsx', 'utf8');

const s1 = code.indexOf('const fetchEmployees = async');
const s2 = code.indexOf('// Filter active/inactive');
if (s1 === -1 || s2 === -1) {
  console.log('Cant find', s1, s2);
  process.exit(1);
}

const replacement = `const fetchEmployees = async (isInitial = true) => {
    if (isInitial) setLoading(true);
    try {
      const empRes = await api.get('/employees/?page_size=100').catch(() => ({ data: [] }));
      const rawEmployees = empRes.data?.data || (Array.isArray(empRes.data) ? empRes.data : (empRes.data?.results || []));
      const mapped = rawEmployees.map((emp, idx) => {
        const u = emp.user || {};
        return {
          id: u.id || emp.id,
          employeeId: emp.id,
          name: u.name || \`Employee \${idx + 1}\`,
          email: u.email || '',
          phone: u.phone || u.phone_number || '',
          role: emp.employee_type || 'STAFF',
          department: emp.department || '',
          designation: emp.designation || '',
          status: emp.status === 'ACTIVE' ? 'Active' : 'Inactive',
          joinDate: new Date(emp.created_at || Date.now()).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
          })
        };
      });
      setEmployees(mapped);
    } catch (err) {
      console.error("Fetch employees failed:", err);
      setError('Failed to load employees from the server.');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      let cleanPhone = formData.phone.replace(/\\D/g, '');
      if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

      if (editingUser) {
        const targetUserId = editingUser.id;
        const targetEmpId = editingUser.employeeId;

        if (targetUserId) {
          await api.patch(\`/users/\${targetUserId}/\`, {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: cleanPhone
          });
        }
        
        if (targetEmpId) {
          await api.patch(\`/employees/\${targetEmpId}/\`, {
            employee_type: formData.role.toUpperCase(),
            department: formData.department,
            designation: formData.designation,
            status: formData.status === 'Active' ? 'ACTIVE' : 'INACTIVE'
          });
        }
      } else {
        const userRes = await api.post('/users/', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: cleanPhone,
          password: formData.password.trim(),
          is_active: true
        });
        
        const newUserObj = userRes.data?.data || userRes.data;
        const newUserId = newUserObj?.id;
        
        if (newUserId) {
          await api.post('/employees/', {
            user: newUserId,
            employee_type: formData.role.toUpperCase(),
            department: formData.department,
            designation: formData.designation,
            status: formData.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
            restaurant: 1
          });
        }
      }

      await fetchEmployees(false);
      handleCloseModal();
    } catch (err) {
      console.error("Save employee failed:", err);
      const msg = err.response?.data?.detail || err.message || 'Failed to save employee.';
      alert(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteEmployee = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this employee?')) return;
    
    try {
      const targetEmp = employees.find(e => e.id === userId);
      if (targetEmp && targetEmp.employeeId) {
        await api.delete(\`/employees/\${targetEmp.employeeId}/\`).catch(() => {});
      }
      await api.delete(\`/users/\${userId}/\`);
      await fetchEmployees(false);
    } catch (err) {
      console.error("Delete employee failed:", err);
      alert('Failed to delete employee from backend.');
    }
  };

  `;

code = code.substring(0, s1) + replacement + code.substring(s2);
fs.writeFileSync('src/pages/admin/Users.jsx', code);
console.log('Users.jsx rewritten!');
