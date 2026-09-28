import { useEffect, useState } from "react";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";
import AnalyticsPanel from "../components/analytics/AnalyticsPanel.jsx";

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analytics/global")
      .then((r) => setStats(r.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto" />
            <p className="text-sm mt-4" style={{ color: "var(--text-muted)" }}>
              Loading analytics...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📊 Analytics</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Overview of all your projects and tasks
          </p>
        </div>

        {/* Use the reusable AnalyticsPanel component */}
        <AnalyticsPanel />
      </div>
    </Layout>
  );
}