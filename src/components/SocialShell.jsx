import { Newspaper } from "lucide-react";
import { AppShell } from "./AppShell";
import { mentorNavFor, studentNav } from "./navs";
import { useApi } from "../services/useApi";
import { ROLE_LABEL } from "../services/api";

export default function SocialShell({ children }) {
  const { user } = useApi();
  let nav = [{ to: "/feed", label: "Feed", icon: Newspaper }];
  if (user.role === "student") nav = studentNav;
  if (user.role === "mentor") nav = mentorNavFor(user.id);
  return <AppShell nav={nav} user={user} subtitle={ROLE_LABEL[user.role]}>{children}</AppShell>;
}
