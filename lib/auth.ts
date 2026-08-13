'use client';

import { supabase, Profile } from './supabase';
import { User } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['adminmotel@gmail.com', 'admin@microstay.us', 'team@microstay.us', 'manager@microstay.us'];

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(email: string, password: string, name: string, phone: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (data.user && !error) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      name,
      phone,
      role: 'customer',
    });
  }

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function checkAdminAccess(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  if (!profile || profile.role !== 'admin') return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;

  return isAdminEmail(user.email);
}

export async function resetPassword(email: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Configuration error' };
    }

    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : 'https://microstay.us';

    const response = await fetch(`${supabaseUrl}/functions/v1/send-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'X-Client-Info': 'supabase-js/2.58.0',
        'Apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        email,
        redirectTo: redirectUrl,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Email send error:', result);
      return { success: false, error: result.error || 'Failed to send reset email' };
    }

    return { success: true, message: 'Password reset email sent. Check your inbox.' };
  } catch (err: any) {
    console.error('Reset password exception:', err);
    return { success: false, error: err.message || 'Failed to send reset email' };
  }
}
