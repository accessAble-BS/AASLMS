auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = '/';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await auth.signOut();
    window.location.href = '/';
  } catch (error) {
    console.error('Logout failed:', error);
  }
});
