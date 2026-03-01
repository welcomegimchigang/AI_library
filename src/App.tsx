import { useEffect } from "react";
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
import { SubmitToolPage } from "@/pages/submit-tool-page";
import { FeedbackPage } from "@/pages/feedback-page";

export default function App() {
  useEffect(() => {
    // Generate an anonymous session ID for analytics tracking if it doesn't exist
    if (!localStorage.getItem("loominai_session_id")) {
      const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("loominai_session_id", newSessionId);
    }
  }, []);

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
      <Route path="/submit" element={<SubmitToolPage />} />
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
