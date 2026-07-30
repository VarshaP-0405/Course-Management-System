(function () {
  const STORAGE_KEYS = {
    session: 'cms_session',
    users: 'cms_users',
    enrollments: 'cms_enrollments',
    resetEmail: 'cms_reset_email'
  };

  const getStoredUsers = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.users) || '[]');
    } catch (error) {
      return [];
    }
  };

  const saveStoredUsers = (users) => {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  };

  const getStoredSession = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || 'null');
    } catch (error) {
      return null;
    }
  };

  const saveStoredSession = (user) => {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
  };

  const clearStoredSession = () => {
    localStorage.removeItem(STORAGE_KEYS.session);
  };

  const getStoredEnrollments = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.enrollments) || '[]');
    } catch (error) {
      return [];
    }
  };

  const saveStoredEnrollments = (enrollments) => {
    localStorage.setItem(STORAGE_KEYS.enrollments, JSON.stringify(enrollments));
  };

  const showFormError = (form, message) => {
    let errorBox = form.querySelector('.form-error');
    if (!errorBox) {
      errorBox = document.createElement('div');
      errorBox.className = 'form-error alert alert-danger mt-3';
      form.appendChild(errorBox);
    }
    errorBox.textContent = message;
    errorBox.classList.remove('d-none');
  };

  const clearFormError = (form) => {
    const errorBox = form.querySelector('.form-error');
    if (errorBox) {
      errorBox.textContent = '';
      errorBox.classList.add('d-none');
    }
  };

  const showFormStatus = (form, message, type = 'success') => {
    let statusBox = form.querySelector('.form-status');
    if (!statusBox) {
      statusBox = document.createElement('div');
      statusBox.className = 'form-status alert mt-3';
      form.appendChild(statusBox);
    }
    statusBox.className = `form-status alert alert-${type} mt-3`;
    statusBox.textContent = message;
    statusBox.classList.remove('d-none');
  };

  const clearFormStatus = (form) => {
    const statusBox = form.querySelector('.form-status');
    if (statusBox) {
      statusBox.textContent = '';
      statusBox.classList.add('d-none');
    }
  };

  const setFieldError = (field, message) => {
    field.classList.add('is-invalid');
    let feedback = field.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      field.parentElement.appendChild(feedback);
    }
    feedback.textContent = message;
  };

  const clearFieldError = (field) => {
    field.classList.remove('is-invalid');
    const feedback = field.parentElement.querySelector('.invalid-feedback');
    if (feedback) {
      feedback.remove();
    }
  };

  const getPageName = () => {
    const pathName = window.location.pathname.split('/').pop() || 'index.html';
    return pathName.replace(/\.html$/, '');
  };

  const getRedirectTarget = (form, type) => {
    if (form.dataset.redirectTo) {
      return form.dataset.redirectTo;
    }

    if (type === 'login') {
      const roleField = form.querySelector('select[name="role"]');
      const selectedRole = roleField ? roleField.value : '';
      if (selectedRole === '1') return 'admin-dashboard';
      if (selectedRole === '2') return 'faculty-dashboard';
      return 'student-dashboard';
    }

    return null;
  };

  const resolveRoute = (page) => {
    const routeMap = {
      'home': '/',
      'index': '/',
      'login': '/login',
      'register': '/register',
      'forgot-password': '/forgot-password',
      'reset-password': '/reset-password',
      'student-dashboard': '/student/dashboard',
      'admin-dashboard': '/admin/dashboard',
      'faculty-dashboard': '/faculty/dashboard',
      'courses': '/courses',
      'browse-courses': '/browse-courses',
      'my-courses': '/my-courses',
      'notifications': '/notifications',
      'progress': '/progress',
      'certificate': '/certificate',
      'add-course': '/add-course',
      'edit-course': '/edit-course',
      'enrollment-success': '/enroll'
    };

    const target = routeMap[page] || page;

    if (window.location.protocol === 'file:') {
      if (target === '/') return 'index.html';
      if (target.startsWith('/')) {
        return `${target.replace(/^\//, '').replace(/\//g, '-')}.html`;
      }
      return `${target}.html`;
    }

    return target;
  };

  const navigateTo = (page) => {
    window.location.assign(resolveRoute(page));
  };

  const initializeAuthState = () => {
    const session = getStoredSession();
    const pageName = getPageName();
    const isProtectedDashboard = ['student-dashboard', 'faculty-dashboard', 'admin-dashboard'].includes(pageName);

    document.querySelectorAll('a[href*="/logout"], a[data-auth-action="logout"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        clearStoredSession();
        navigateTo('login');
      });
    });

    if (isProtectedDashboard && !session) {
      navigateTo('login');
      return;
    }

    const greeting = document.querySelector('[data-user-greeting]');
    if (greeting && session) {
      const firstName = session.first_name || session.email.split('@')[0];
      greeting.textContent = `Welcome, ${firstName} 👋`;
    }

    if (session) {
      const rolePageMap = {
        '1': 'admin-dashboard',
        '2': 'faculty-dashboard',
        '3': 'student-dashboard'
      };
      const target = rolePageMap[session.role] || 'student-dashboard';
      document.querySelectorAll('[data-auth-label="login"]').forEach((link) => {
        link.textContent = 'Dashboard';
        link.setAttribute('href', resolveRoute(target));
      });
      document.querySelectorAll('[data-auth-label="logout"]').forEach((link) => {
        link.textContent = 'Logout';
      });
    }
  };

  const initializeCourseState = () => {
    const enrollments = getStoredEnrollments();
    document.querySelectorAll('[data-enroll-button]').forEach((button) => {
      const courseName = button.dataset.enrollButton || button.textContent.trim();
      if (enrollments.includes(courseName)) {
        button.textContent = 'Enrolled';
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
      }

      button.addEventListener('click', (event) => {
        event.preventDefault();
        const nextEnrollments = Array.from(new Set([...enrollments, courseName]));
        saveStoredEnrollments(nextEnrollments);
        button.textContent = 'Enrolled';
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
      });
    });
  };

  const forms = document.querySelectorAll('form[data-validate-form]');

  forms.forEach((form) => {
    const fields = Array.from(form.querySelectorAll('input, select, textarea'));

    fields.forEach((field) => {
      field.addEventListener('input', () => clearFieldError(field));
      field.addEventListener('change', () => clearFieldError(field));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearFormError(form);
      clearFormStatus(form);
      fields.forEach((field) => clearFieldError(field));

      const errors = [];
      const type = form.dataset.validateForm;

      if (type === 'login') {
        const roleField = form.querySelector('select[name="role"]');
        if (!roleField || !roleField.value) {
          errors.push(['role', 'Please select a role before continuing.']);
        }

        const emailField = form.querySelector('input[name="email"]');
        if (!emailField || !emailField.value.trim()) {
          errors.push(['email', 'Please enter your email address.']);
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
          errors.push(['email', 'Please enter a valid email address.']);
        }

        const passwordField = form.querySelector('input[name="password"]');
        if (!passwordField || !passwordField.value) {
          errors.push(['password', 'Please enter your password.']);
        } else if (passwordField.value.length < 6) {
          errors.push(['password', 'Password must be at least 6 characters long.']);
        }
      }

      if (type === 'register') {
        const fieldsToCheck = [
          ['first_name', 'Please enter your first name.'],
          ['last_name', 'Please enter your last name.'],
          ['email', 'Please enter your email address.'],
          ['phone', 'Please enter your phone number.'],
          ['department', 'Please select your department.'],
          ['password', 'Please choose a password.'],
          ['confirm_password', 'Please confirm your password.']
        ];

        fieldsToCheck.forEach(([name, message]) => {
          const field = form.querySelector(`[name="${name}"]`);
          if (!field || !field.value.trim()) {
            errors.push([name, message]);
          }
        });

        const emailField = form.querySelector('input[name="email"]');
        if (emailField && emailField.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
          errors.push(['email', 'Please enter a valid email address.']);
        }

        const phoneField = form.querySelector('input[name="phone"]');
        if (phoneField && phoneField.value.trim() && !/^\+?[0-9\s-]{7,15}$/.test(phoneField.value.trim())) {
          errors.push(['phone', 'Please enter a valid phone number.']);
        }

        const passwordField = form.querySelector('input[name="password"]');
        const confirmPasswordField = form.querySelector('input[name="confirm_password"]');
        if (passwordField && passwordField.value && passwordField.value.length < 8) {
          errors.push(['password', 'Password must be at least 8 characters long.']);
        }
        if (passwordField && confirmPasswordField && passwordField.value && confirmPasswordField.value && passwordField.value !== confirmPasswordField.value) {
          errors.push(['confirm_password', 'Passwords do not match.']);
        }
      }

      if (type === 'forgot') {
        const emailField = form.querySelector('input[name="email"]');
        if (!emailField || !emailField.value.trim()) {
          errors.push(['email', 'Please enter your registered email address.']);
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
          errors.push(['email', 'Please enter a valid email address.']);
        }
      }

      if (type === 'reset') {
        const passwordField = form.querySelector('input[name="password"]');
        const confirmPasswordField = form.querySelector('input[name="confirm_password"]');
        if (!passwordField || !passwordField.value) {
          errors.push(['password', 'Please enter a new password.']);
        } else if (passwordField.value.length < 8) {
          errors.push(['password', 'Password must be at least 8 characters long.']);
        }
        if (!confirmPasswordField || !confirmPasswordField.value) {
          errors.push(['confirm_password', 'Please confirm your new password.']);
        }
        if (passwordField && confirmPasswordField && passwordField.value && confirmPasswordField.value && passwordField.value !== confirmPasswordField.value) {
          errors.push(['confirm_password', 'Passwords do not match.']);
        }
      }

      if (errors.length) {
        errors.forEach(([name, message]) => {
          const field = form.querySelector(`[name="${name}"]`);
          if (field) {
            setFieldError(field, message);
          } else {
            showFormError(form, message);
          }
        });
        return;
      }

      const redirectTarget = getRedirectTarget(form, type);

      if (type === 'login') {
        const roleField = form.querySelector('select[name="role"]');
        const emailField = form.querySelector('input[name="email"]');
        const passwordField = form.querySelector('input[name="password"]');
        const normalizedEmail = emailField.value.trim().toLowerCase();
        const roleValue = roleField ? roleField.value : '3';
        const users = getStoredUsers();
        const existingUser = users.find((user) => user.email.toLowerCase() === normalizedEmail);

        const profileUser = {
          id: existingUser?.id || Date.now(),
          email: normalizedEmail,
          role: roleValue,
          first_name: existingUser?.first_name || normalizedEmail.split('@')[0],
          last_name: existingUser?.last_name || '',
          department: existingUser?.department || '',
          phone: existingUser?.phone || ''
        };

        const nextUsers = existingUser
          ? users.map((user) => (user.email.toLowerCase() === normalizedEmail ? profileUser : user))
          : [...users, profileUser];

        saveStoredUsers(nextUsers);
        saveStoredSession(profileUser);
        showFormStatus(form, 'Signed in successfully. Redirecting...', 'success');
        window.setTimeout(() => navigateTo(redirectTarget || 'student-dashboard'), 300);
        return;
      }

      if (type === 'register') {
        const firstName = form.querySelector('input[name="first_name"]')?.value.trim() || '';
        const lastName = form.querySelector('input[name="last_name"]')?.value.trim() || '';
        const emailField = form.querySelector('input[name="email"]');
        const email = emailField?.value.trim().toLowerCase() || '';
        const phone = form.querySelector('input[name="phone"]')?.value.trim() || '';
        const department = form.querySelector('select[name="department"]')?.value || '';
        const role = form.querySelector('select[name="role"]')?.value || '3';
        const users = getStoredUsers();

        if (users.some((user) => user.email.toLowerCase() === email)) {
          showFormError(form, 'An account with this email already exists.');
          return;
        }

        const newUser = {
          id: Date.now(),
          email,
          role,
          first_name: firstName,
          last_name: lastName,
          department,
          phone
        };

        saveStoredUsers([...users, newUser]);
        saveStoredSession(newUser);
        showFormStatus(form, 'Account created successfully. Redirecting to your dashboard...', 'success');
        window.setTimeout(() => navigateTo(role === '1' ? 'admin-dashboard' : role === '2' ? 'faculty-dashboard' : 'student-dashboard'), 400);
        return;
      }

      if (type === 'forgot') {
        const emailField = form.querySelector('input[name="email"]');
        const email = emailField?.value.trim().toLowerCase() || '';
        localStorage.setItem(STORAGE_KEYS.resetEmail, email);
        showFormStatus(form, 'Password reset request saved locally. Redirecting...', 'success');
        window.setTimeout(() => navigateTo('reset-password'), 350);
        return;
      }

      if (type === 'reset') {
        showFormStatus(form, 'Password reset completed locally. Redirecting to login...', 'success');
        window.setTimeout(() => navigateTo('login'), 350);
        return;
      }

      if (redirectTarget) {
        navigateTo(redirectTarget);
        return;
      }

      form.submit();
    });
  });

  initializeAuthState();
  initializeCourseState();
})();
