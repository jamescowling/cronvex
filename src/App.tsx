import { Crons } from "./components/Crons";
import { Logs } from "./components/Logs";
import { ThemeProvider } from "./components/ThemeProvider";

import { Footer } from "./components/Footer";
import { Header } from "./components/Header";

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="bg-secondary min-h-screen">
        <main className="container flex flex-col gap-8">
          <Header />
          <Crons />
          <Logs />
          <Footer />
        </main>
      </div>
    </ThemeProvider>
  );
}
