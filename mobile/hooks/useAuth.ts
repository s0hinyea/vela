/**
 * useAuth — Supabase auth state hook.
 * Works with Person B's existing profiles table.
 * Provides user, session, loading state, and auth actions.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    caregiverName: string,
    caregiverPin: string
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      caregiverName: string,
      caregiverPin: string
    ) => {
      // 1. Create Supabase auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) return { error: authError.message };
      if (!data.user) return { error: "Sign up failed — no user returned." };

      // 2. Insert into Person B's existing profiles table
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        caregiver_name: caregiverName,
        caregiver_pin: caregiverPin,
        senior_name: "", // set later in onboarding, table requires NOT NULL
        senior_photo_url: null,
      });

      if (profileError) {
        console.error("Profile insert error:", profileError);
        return { error: profileError.message };
      }

      return { error: null };
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, session, loading, signUp, signIn, signOut };
}
