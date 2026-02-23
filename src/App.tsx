import { Route, Routes } from "react-router-dom";

import { ChatPage } from "@/pages/chat-page";
import { HomePage } from "@/pages/home-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { TermsPage } from "@/pages/terms-page";
import { AboutPage } from "@/pages/about-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { ToolDetailPage } from "@/pages/tool-detail-page";
import { AdminPage } from "@/pages/admin-page";
import { ProfilePage } from "@/pages/profile-page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/tool/:id" element={<ToolDetailPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
