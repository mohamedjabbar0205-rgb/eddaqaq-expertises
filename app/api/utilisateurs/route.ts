import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "../../../utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { data: profil, error: profilError } = await supabase
      .from("profiles")
      .select("role, actif")
      .eq("id", user.id)
      .single();

    if (
      profilError ||
      !profil ||
      profil.role !== "Administrateur" ||
      profil.actif !== true
    ) {
      return NextResponse.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const nom = typeof body.nom === "string" ? body.nom.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password =
      typeof body.password === "string" ? body.password.trim() : "";

    if (!nom || !email || !password) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe sont obligatoires." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        { error: "Configuration serveur incomplète." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: createdUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nom,
        },
      });

    if (createError) {
      console.error("Erreur création utilisateur:", createError);

      let message = "Impossible de créer l'utilisateur.";

      if (
        createError.message?.toLowerCase().includes("already") ||
        createError.message?.toLowerCase().includes("registered")
      ) {
        message = "Un utilisateur avec cet email existe déjà.";
      }

      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!createdUser.user) {
      return NextResponse.json(
        { error: "Utilisateur non créé." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Employé créé avec succès.",
        user: {
          id: createdUser.user.id,
          email: createdUser.user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur API création utilisateur:", error);

    return NextResponse.json(
      { error: "Une erreur serveur est survenue." },
      { status: 500 }
    );
  }
}
