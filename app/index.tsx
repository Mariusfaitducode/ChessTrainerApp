import { Redirect } from "expo-router";
import { useAppStore } from "@/stores/appStore";

export default function Index() {
  const username = useAppStore((s) => s.username);
  return <Redirect href={username ? "/games" : "/username"} />;
}
