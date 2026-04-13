import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "user" | "prospect" | null;

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

        // Check user_roles table first
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (!error && data && data.length > 0) {
          const hasAdmin = data.some((r) => r.role === "admin");
          const hasProspect = data.some((r) => r.role === "prospect");
          setRole(hasAdmin ? "admin" : hasProspect ? "prospect" : "user");
        } else {
          // No role in user_roles — check approved_emails and sync
          const userEmail = user.email?.toLowerCase();
          if (userEmail) {
            const { data: approvedData } = await supabase
              .from("approved_emails")
              .select("role")
              .eq("email", userEmail)
              .maybeSingle();

            const resolvedRole = (approvedData?.role as UserRole) || "user";

            // Sync to user_roles so we don't need to look it up again
            await supabase
              .from("user_roles")
              .upsert({ user_id: user.id, role: resolvedRole }, { onConflict: "user_id" });

            setRole(resolvedRole);
          } else {
            setRole("user");
          }
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

  return { role, loading, isAdmin: role === "admin", isProspect: role === "prospect" };
};
