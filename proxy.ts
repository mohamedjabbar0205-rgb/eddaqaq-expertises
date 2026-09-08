import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname.startsWith("/login");
  const isUsersPage = pathname.startsWith("/utilisateurs");

  // 1. Pas connecté -> Login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2. Utilisateur connecté : récupérer son profil
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, actif")
      .eq("id", user.id)
      .single();

    // Profil inexistant ou compte désactivé
    if (profileError || !profile || profile.actif !== true) {
      await supabase.auth.signOut();

      const url = request.nextUrl.clone();
      url.pathname = "/login";

      const redirectResponse = NextResponse.redirect(url);

      // Supprimer les cookies Supabase
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith("sb-")) {
          redirectResponse.cookies.delete(cookie.name);
        }
      });

      return redirectResponse;
    }

    // 3. Déjà connecté -> ne pas retourner au Login
    if (isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // 4. Page Utilisateurs -> Administrateur uniquement
    if (
      isUsersPage &&
      profile.role !== "Administrateur"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo-eddaqaq.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};