import { Newspaper } from "lucide-react";
import { AppShell } from "./AppShell";
import { studentNav } from "./navs";
import { useApi } from "../services/useApi";
import { ROLE_LABEL } from "../services/api";

export default function SocialShell({ children }) {
  const { user } = useApi();
  const nav = user.role === "student" ? studentNav : [{ to: "/feed", label: "Feed", icon: Newspaper }];
  return <AppShell nav={nav} user={user} subtitle={ROLE_LABEL[user.role]}>{children}</AppShell>;
}
