import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink } from "lucide-react";
import Logo from "@/components/Logo";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Neplatná emailová adresa" }).max(255, { message: "Email je příliš dlouhý" }),
  password: z.string().min(8, { message: "Heslo musí mít alespoň 8 znaků" }).max(72, { message: "Heslo je příliš dlouhé" }),
  fullName: z.string().trim().min(1, { message: "Jméno je povinné" }).max(100, { message: "Jméno je příliš dlouhé" }),
});

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Neplatná emailová adresa" }).max(255),
  password: z.string().min(1, { message: "Heslo je povinné" }),
});

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const validation = signUpSchema.safeParse({ email, password, fullName });
      if (!validation.success) {
        toast({
          variant: "destructive",
          title: "Chyba validace",
          description: validation.error.errors[0].message,
        });
        setLoading(false);
        return;
      }

      // Whitelist check — only approved emails can register
      const { data: isApproved, error: checkError } = await supabase
        .rpc('is_email_approved', { check_email: email.trim().toLowerCase() });
      if (checkError || !isApproved) {
        toast({
          variant: "destructive",
          title: "Přístup zamítnut",
          description: "Tento email nemá povolen přístup. Kontaktujte správce.",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            variant: "destructive",
            title: "Email již existuje",
            description: "Tento email je již zaregistrován. Zkuste se přihlásit.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Chyba při registraci",
            description: error.message,
          });
        }
      } else {
        toast({
          title: "Úspěšná registrace!",
          description: "Nyní se můžete přihlásit.",
        });
        setEmail("");
        setPassword("");
        setFullName("");
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      const validation = signInSchema.safeParse({ email, password });
      if (!validation.success) {
        toast({
          variant: "destructive",
          title: "Chyba validace",
          description: validation.error.errors[0].message,
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            variant: "destructive",
            title: "Chyba při přihlášení",
            description: "Nesprávný email nebo heslo.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Chyba při přihlášení",
            description: error.message,
          });
        }
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

const handleForgotPassword = async () => {
  if (!resetEmail) {
    toast({
      title: "Chyba",
      description: "Zadejte prosím váš email",
      variant: "destructive",
    });
    return;
  }

  try {
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;

    toast({
      title: "Email odeslán",
      description: "Zkontrolujte svou emailovou schránku pro odkaz na reset hesla",
    });
    setShowForgotPassword(false);
    setResetEmail("");
  } catch (error: any) {
    toast({
      title: "Chyba",
      description: error.message || "Nepodařilo se odeslat email pro reset hesla",
      variant: "destructive",
    });
  } finally {
    setIsResetting(false);
  }
};

return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <Logo size={64} />
          </div>
          <CardTitle className="text-2xl">Kalkulačka REALITNÍHO RENTIÉRA®</CardTitle>
          <CardDescription>
            Profesionální nástroj pro správu financí a strategické budování ziskového realitního portfolia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Přihlášení</TabsTrigger>
              <TabsTrigger value="signup">Registrace</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="vas@email.cz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Heslo</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Přihlásit se
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-muted-foreground"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Zapomenuté heslo
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Celé jméno</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Jan Novák"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="vas@email.cz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Heslo</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrovat se
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      {showForgotPassword && (
        <Card className="w-full max-w-md mt-4 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Zapomenuté heslo</CardTitle>
            <CardDescription>
              Zadejte váš email a my vám pošleme odkaz pro obnovení hesla.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="vas@email.cz"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={isResetting}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleForgotPassword}
                disabled={isResetting}
                className="flex-1"
              >
                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isResetting ? "Odesílání..." : "Odeslat odkaz"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                }}
                disabled={isResetting}
              >
                Zrušit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Auth;
