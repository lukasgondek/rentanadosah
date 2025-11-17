import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp } from "lucide-react";
import { z } from "zod";

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, { message: "Heslo musí mít alespoň 8 znaků" })
    .max(72, { message: "Heslo je příliš dlouhé" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hesla se neshodují",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user came from reset email link
    const accessToken = searchParams.get('access_token');
    const type = searchParams.get('type');
    
    if (!accessToken || type !== 'recovery') {
      toast({
        variant: "destructive",
        title: "Neplatný odkaz",
        description: "Tento odkaz není platný nebo již vypršel.",
      });
      navigate("/auth");
    }
  }, [searchParams, navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const validation = resetPasswordSchema.safeParse({ password, confirmPassword });
      if (!validation.success) {
        toast({
          variant: "destructive",
          title: "Chyba validace",
          description: validation.error.errors[0].message,
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Chyba při změně hesla",
          description: error.message,
        });
      } else {
        toast({
          title: "Heslo změněno!",
          description: "Vaše heslo bylo úspěšně změněno. Nyní se můžete přihlásit.",
        });
        navigate("/auth");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Něco se pokazilo. Zkuste to prosím znovu.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Nové heslo</CardTitle>
          <CardDescription>
            Zadejte své nové heslo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nové heslo</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Potvrzení hesla</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Změnit heslo
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
