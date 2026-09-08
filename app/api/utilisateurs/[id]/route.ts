import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "../../../../utils/supabase/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
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

    const body = await request.json();

    const updates: {
      actif?: boolean;
      nom?: string;
      role?: "Administrateur" | "Employé";
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if ("actif" in body) {
      if (typeof body.actif !== "boolean") {
        return NextResponse.json(
          { error: "Statut invalide." },
          { status: 400 }
        );
      }

      if (id === user.id && body.actif === false) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas désactiver votre propre compte." },
          { status: 400 }
        );
      }

      updates.actif = body.actif;
    }

    if ("nom" in body || "role" in body) {
      if (id === user.id) {
        return NextResponse.json(
          {
            error:
              "Vous ne pouvez pas modifier votre propre compte depuis cette page.",
          },
          { status: 400 }
        );
      }

      const nom = typeof body.nom === "string" ? body.nom.trim() : "";
      const role = body.role;

      if (!nom) {
        return NextResponse.json(
          { error: "Le nom complet est obligatoire." },
          { status: 400 }
        );
      }

      if (role !== "Administrateur" && role !== "Employé") {
        return NextResponse.json(
          { error: "Rôle invalide." },
          { status: 400 }
        );
      }

      updates.nom = nom;
      updates.role = role;
    }

    if (!("actif" in body) && !("nom" in body || "role" in body)) {
      return NextResponse.json(
        { error: "Aucune modification à enregistrer." },
        { status: 400 }
      );
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", id)
      .single();

    if (targetError || !target) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json(
        { error: "Impossible de modifier l'utilisateur." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "actif" in body
          ? body.actif
            ? "Utilisateur activé avec succès."
            : "Utilisateur désactivé avec succès."
          : "Utilisateur modifié avec succès.",
    });
  } catch (error) {
    console.error("Erreur API utilisateur:", error);
    return NextResponse.json(
      { error: "Une erreur serveur est survenue." },
      { status: 500 }
    );
  }
}
