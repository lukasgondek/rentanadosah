import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "user" | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error || !data || data.length === 0) {
          setRole("user");
        } else {
          const hasAdmin = data.some((r) => r.role === "admin");
          setRole(hasAdmin ? "admin" : "user");
        }
      } catch (error) {
        setRole("user");
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { role, loading, isAdmin: role === "admin" };
};
