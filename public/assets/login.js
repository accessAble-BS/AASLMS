// Login page functionality
document.getElementById('loginForm').addEventListener('submit', handleLogin);

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('errorMessage');
  
  // Clear previous error
  errorDiv.classList.remove('show');
  errorDiv.textContent = '';
  
  try {
    // Sign in with Firebase
    const result = await auth.signInWithEmailAndPassword(email, password);
    
    if (result.user) {
      // Redirect to dashboard or home page
      window.location.href = '/dashboard';
    }
  } catch (error) {
    // Display error message
    let errorText = 'Login failed. Please check your email and password.';
    
    if (error.code === 'auth/invalid-email') {
      errorText = 'Invalid email address.';
    } else if (error.code === 'auth/user-disabled') {
      errorText = 'This account has been disabled.';
    } else if (error.code === 'auth/user-not-found') {
      errorText = 'No account found with this email.';
    } else if (error.code === 'auth/wrong-password') {
      errorText = 'Incorrect password.';
    }
    
    errorDiv.textContent = errorText;
    errorDiv.classList.add('show');
  }
}

// Check if already logged in
auth.onAuthStateChanged(user => {
  if (user) {
    window.location.href = '/dashboard';
  }
});
