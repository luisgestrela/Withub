import { supabase } from "./supabase.js";

const fail = (error) => {
  if (!error) return;
  if (/over_email_send_rate_limit|email rate limit exceeded/i.test(`${error.code || ""} ${error.message || ""}`)) {
    throw new Error("O Supabase atingiu o limite de envio de e-mails. Aguarde antes de tentar novamente ou configure um SMTP próprio em Authentication → SMTP Settings.");
  }
  throw new Error(error.message || "Falha ao comunicar com o Supabase.");
};

export async function getCurrentAccount() {
  const { data: { user }, error } = await supabase.auth.getUser();
  fail(error);
  if (!user) return null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, institution, course, avatar_path")
    .eq("id", user.id)
    .single();
  fail(profileError);
  return {
    id: profile.id,
    name: profile.full_name,
    initials: profile.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    email: user.email,
    role: profile.role,
    institution: profile.institution || "",
    course: profile.course || "",
    photo: profile.avatar_path ? supabase.storage.from("withub-avatars").getPublicUrl(profile.avatar_path).data.publicUrl : "",
  };
}

export async function signInWithEmail({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  fail(error);
  return getCurrentAccount();
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  fail(error);
}

export async function signUpStudent({ name, email, password, institution, course }) {
  const { data: versions, error: versionsError } = await supabase
    .from("legal_document_versions")
    .select("terms_version, privacy_version")
    .eq("singleton", true)
    .single();
  fail(versionsError);
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim(), institution, course: course.trim(), onboarding: "student", terms_version: versions.terms_version, privacy_version: versions.privacy_version } },
  });
  fail(error);
  if (!data.session) return { needsEmailConfirmation: true };
  const { error: registerError } = await supabase.rpc("register_student", {
    p_institution: institution,
    p_course: course.trim(),
    p_terms_version: versions.terms_version,
    p_privacy_version: versions.privacy_version,
  });
  fail(registerError);
  await supabase.auth.updateUser({ data: { onboarding: null } });
  return { account: await getCurrentAccount() };
}

export async function signUpMentor({ name, email, password, institution, position, specialties, steamAreas, bio, education = "", experience = "", links, photo = "" }) {
  const { data: versions, error: versionsError } = await supabase
    .from("legal_document_versions")
    .select("terms_version, privacy_version")
    .eq("singleton", true)
    .single();
  fail(versionsError);
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim(), onboarding: "mentor", institution, position, specialties, steam_areas: steamAreas, bio, education, experience, links, terms_version: versions.terms_version, privacy_version: versions.privacy_version } },
  });
  fail(error);
  if (!data.session) return { needsEmailConfirmation: true };
  const { error: registerError } = await supabase.rpc("register_mentor", {
    p_full_name: name.trim(), p_institution: institution.trim(), p_position: position.trim(),
    p_specialties: specialties, p_steam_areas: steamAreas, p_bio: bio, p_education: education,
    p_experience: experience, p_links: links, p_terms_version: versions.terms_version,
    p_privacy_version: versions.privacy_version,
  });
  fail(registerError);
  if (photo) {
    const blob = await (await fetch(photo)).blob();
    const path = `${data.user.id}/avatar`;
    const { error: uploadError } = await supabase.storage.from("withub-avatars").upload(path, blob, { upsert: true, contentType: blob.type });
    fail(uploadError);
    const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", data.user.id);
    fail(profileError);
  }
  await supabase.auth.updateUser({ data: { onboarding: null, photo: null } });
  return { account: await getCurrentAccount() };
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(async () => {
      try {
        const metadata = session?.user?.user_metadata;
        if (metadata?.onboarding === "student") {
          const { error } = await supabase.rpc("register_student", {
            p_institution: metadata.institution, p_course: metadata.course || "",
            p_terms_version: metadata.terms_version, p_privacy_version: metadata.privacy_version,
          });
          fail(error);
          await supabase.auth.updateUser({ data: { onboarding: null } });
        } else if (metadata?.onboarding === "mentor") {
          const { error } = await supabase.rpc("register_mentor", {
            p_full_name: metadata.full_name, p_institution: metadata.institution, p_position: metadata.position,
            p_specialties: metadata.specialties, p_steam_areas: metadata.steam_areas || [], p_bio: metadata.bio || "",
            p_education: metadata.education || "", p_experience: metadata.experience || "", p_links: metadata.links || {},
            p_terms_version: metadata.terms_version, p_privacy_version: metadata.privacy_version,
          });
          fail(error);
          await supabase.auth.updateUser({ data: { onboarding: null } });
        }
      } catch (error) {
        console.error("Falha ao concluir cadastro WitHub:", error.message);
      }
      callback(session);
    }, 0);
  });
  return () => data.subscription.unsubscribe();
}
