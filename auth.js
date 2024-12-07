// auth.js
import { supabase } from './supabaseClient.js';

// Sign up new user
window.signUpUser = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if(!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if(error) {
    alert("Sign up error: " + error.message);
  } else {
    alert("Sign up successful! Please check your email for confirmation.");
  }
};

// Login existing user
window.loginUser = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if(!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) {
    alert("Login error: " + error.message);
  } else {
    alert("Login successful!");
  }
};

// Logout user
window.logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if(error) {
    alert("Logout error: " + error.message);
  } else {
    alert("Logged out successfully");
  }
};

// Monitor auth state
supabase.auth.onAuthStateChange((event, session) => {
  window.currentUser = session?.user || null;
  console.log("Auth state changed:", event, window.currentUser);
});
