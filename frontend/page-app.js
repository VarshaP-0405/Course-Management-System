(function () {
  const STORAGE_KEYS = {
    session: 'cms_session',
    users: 'cms_users',
    enrollments: 'cms_enrollments'
  };

  const getStoredSession = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || 'null');
    } catch (error) {
      return null;
    }
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

  const getPageName = () => {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace(/\.html$/, '');
  };

  const navigateTo = (target) => {
    const routeMap = {
      '/': 'index.html',
      '/login': 'login.html',
      '/register': 'register.html',
      '/forgot-password': 'forgot-password.html',
      '/reset-password': 'reset-password.html',
      '/student/dashboard': 'student-dashboard.html',
      '/faculty/dashboard': 'faculty-dashboard.html',
      '/admin/dashboard': 'admin-dashboard.html',
      '/courses': 'courses.html',
      '/browse-courses': 'browse-courses.html',
      '/my-courses': 'my-courses.html',
      '/notifications': 'notifications.html',
      '/progress': 'progress.html',
      '/certificate': 'certificate.html',
      '/add-course': 'add-course.html',
      '/edit-course': 'edit-course.html'
    };

    const resolved = routeMap[target] || target;
    if (window.location.protocol === 'file:') {
      window.location.href = resolved;
      return;
    }
    window.location.assign(resolved);
  };

  const initializeAuth = () => {
    const pageName = getPageName();
    const session = getStoredSession();
    const protectedPages = ['student-dashboard', 'faculty-dashboard', 'admin-dashboard'];

    if (protectedPages.includes(pageName) && !session) {
      navigateTo('login.html');
      return;
    }

    document.querySelectorAll('[data-auth-label="login"]').forEach((link) => {
      if (session) {
        link.textContent = 'Dashboard';
        const roleTarget = session.role === '1' ? 'admin-dashboard.html' : session.role === '2' ? 'faculty-dashboard.html' : 'student-dashboard.html';
        link.setAttribute('href', roleTarget);
      }
    });

    document.querySelectorAll('[data-auth-label="logout"]').forEach((link) => {
      if (session) {
        link.textContent = 'Logout';
      }
    });

    document.querySelectorAll('a[data-auth-action="logout"], a[href*="logout"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        clearStoredSession();
        navigateTo('login.html');
      });
    });

    const greeting = document.querySelector('[data-user-greeting]');
    if (greeting && session) {
      const firstName = session.first_name || session.email?.split('@')[0] || 'Learner';
      greeting.textContent = `Welcome, ${firstName} 👋`;
    }
  };

  const initializeEnrollments = () => {
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
        localStorage.setItem(STORAGE_KEYS.enrollments, JSON.stringify(nextEnrollments));
        button.textContent = 'Enrolled';
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
      });
    });

    const enrolledCount = document.querySelector('[data-enrolled-count]');
    if (enrolledCount) {
      enrolledCount.textContent = `${enrollments.length}`;
    }
  };

  initializeAuth();
  initializeEnrollments();
})();
