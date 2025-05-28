import { Home } from "@components/pages/home/home";
import { SocketProvider } from "contexts/socket";

export default function HomePage() {
  return (
    <SocketProvider>
      <Home />
    </SocketProvider>
  );
}
