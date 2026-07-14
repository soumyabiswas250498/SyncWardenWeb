import { AppShell } from "@/features/devices/components/app-shell";
import { MessagesScreen } from "@/features/shares/components/messages-screen";

const MessagesPage = () => (
  <AppShell layout="full">
    <MessagesScreen />
  </AppShell>
);

export default MessagesPage;
