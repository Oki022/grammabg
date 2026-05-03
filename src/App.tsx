import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Profile from "./pages/Profile.tsx";
import Contact from "./pages/Contact.tsx";
import { AuthProvider } from "./hooks/useAuth.tsx";
import { ThemeProvider } from "./hooks/useTheme.tsx";
import Pricing from "./components/Pricing";

const queryClient = new QueryClient();

const App = () => {
  // --- TADİLAT MODU AYARI ---
  // import.meta.env.DEV şu demek: "Eğer bilgisayarımda çalışıyorsam (npm run dev) burası true olur"
  const isLocal = import.meta.env.DEV;
  const bakimda = true; 

  // Eğer bakimda modundaysak VE kendi bilgisayarımızda DEĞİLSEK (yani canlıdaysak) siyah ekranı göster
  if (bakimda && !isLocal) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#050505', 
        color: 'white', 
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀 Grammabg Hazırlanıyor</h1>
        <p style={{ fontSize: '1.2rem', color: '#888' }}>
          Şu an içeride efsane özellikler ekliyoruz. Çok yakında buradayız kanka!
        </p>
      </div>
    );
  }
  // --- TADİLAT MODU BİTİŞİ ---
  // --- TADİLAT MODU BİTİŞİ ---

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/pricing" element={<Pricing showBackButton={true} />} />
                <Route path="/auth" element={<Auth mode="signin" />} />
                <Route path="/login" element={<Auth mode="signin" />} />
                <Route path="/register" element={<Auth mode="signup" />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
