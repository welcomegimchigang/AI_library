import { Navigate, Route, Routes } from "react-router-dom";

import { ChatPage } from "@/pages/chat-page";
import { HomePage } from "@/pages/home-page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
