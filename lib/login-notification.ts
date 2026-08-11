import { supabase } from './supabase';

export async function sendLoginNotification(userId: string, userEmail: string, role?: string) {
  try {
    const loginData = {
      userId,
      userEmail,
      role,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      loginTime: new Date().toISOString(),
    };

    await fetch('/api/auth/send-login-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });
  } catch (err) {
    console.error('Login notification error:', err);
  }
}
