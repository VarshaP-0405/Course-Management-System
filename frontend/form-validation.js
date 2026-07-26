(function () {
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

  const getRedirectTarget = (form, type) => {
    if (form.dataset.redirectTo) {
      return form.dataset.redirectTo;
    }

    if (type === 'login') {
      const roleField = form.querySelector('select[name="role"]');
      const selectedRole = roleField ? roleField.value : '';
      if (selectedRole === '1') return '/admin/dashboard';
      if (selectedRole === '2') return '/faculty/dashboard';
      return '/student/dashboard';
    }

    return null;
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
      if (redirectTarget) {
        const formData = new FormData(form);
        const body = new URLSearchParams(formData).toString();

        fetch(form.action, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body,
          redirect: 'follow'
        })
          .then((response) => {
            if (response.url) {
              window.location.assign(response.url);
            } else {
              form.submit();
            }
          })
          .catch(() => {
            form.submit();
          });
        return;
      }

      form.submit();
    });
  });
})();
