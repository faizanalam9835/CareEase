import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../Pages/LandingPage";

export default function AllRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />

      {/* Default Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
