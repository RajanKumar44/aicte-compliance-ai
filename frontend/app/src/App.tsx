import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { ValidatePage } from "./pages/ValidatePage";
import { DocumentVaultPage } from "./pages/DocumentVaultPage";
import { AboutPage } from "./pages/AboutPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage";
import { CadreCalculatorPage } from "./pages/CadreCalculatorPage";
import { SignInPage } from "./pages/SignInPage";
import { RequireAuth } from "./components/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/validate" element={<ValidatePage />} />
        <Route path="/vault" element={<DocumentVaultPage />} />
        <Route path="/cadre-calculator" element={<CadreCalculatorPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/applications" element={<RequireAuth><ApplicationsPage /></RequireAuth>} />
        <Route path="/applications/:applicationId" element={<RequireAuth><ApplicationDetailPage /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/history/:runId" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
