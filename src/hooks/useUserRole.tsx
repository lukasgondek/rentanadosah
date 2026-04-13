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

        // Check user_roles table
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (!error && data && data.length > 0) {
          const hasAdmin = data.some((r) => r.role === "admin");
          if (hasAdmin) {
            setRole("admin");
            setLoading(false);
            return;
          }

          const hasProspect = data.some((r) => r.role === "prospect");
          if (hasProspect) {
            setRole("prospect");
            setLoading(false);
            return;
          }
        }

        // Role is "user" or missing — verify against approved_emails
        // is_email_approved is SECURITY DEFINER, callable by anyone
        const userEmail = user.email?.toLowerCase();
        if (userEmail) {
          const { data: isApproved } = await supabase
            .rpc("is_email_approved", { check_email: userEmail });

          if (isApproved) {
            // Email is in approved_emails = confirmed client
            setRole("user");
          } else {
            // NOT in approved_emails = prospect (open registration)
            setRole("prospect");
          }
        } else {
          setRole("prospect");
        }
      } catch (error) {
        setRole("prospect");
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
