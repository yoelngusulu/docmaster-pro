import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Conversion = {
  id: number;
  tool: string;
  original_file_name: string;
  output_file_name: string;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName =
    user.user_metadata?.full_name ||
    "DocMaster User";

  const {
    data: conversions,
    error: conversionsError,
  } = await supabase
    .from("conversion_history")
    .select(
      "id, tool, original_file_name, output_file_name, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    });

  if (conversionsError) {
    console.error(
      "Unable to load conversion history:",
      conversionsError
    );
  }

  const history =
    (conversions as Conversion[] | null) ?? [];

  const totalConversions =
    history.length;

  const now = new Date();

  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const todayConversions =
    history.filter(
      (conversion) =>
        new Date(
          conversion.created_at
        ) >= startOfToday
    ).length;

  const recentConversions =
    history.slice(0, 10);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Welcome */}
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            DocMaster AI Dashboard
          </p>

          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            Welcome, {fullName} 👋
          </h1>

          <p className="mt-3 text-gray-600">
            You are signed in as{" "}
            {user.email}
          </p>
        </div>

        {/* Statistics */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Today&apos;s Conversions
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {todayConversions}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Conversions
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalConversions}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Account Plan
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              Free
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Start a new conversion quickly.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/tools/pdf"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <p className="text-2xl">
                📄
              </p>

              <h3 className="mt-3 font-semibold text-gray-900">
                PDF Tools
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Convert, merge, split,
                compress and manage PDFs.
              </p>
            </Link>

            <Link
              href="/tools/image"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <p className="text-2xl">
                🖼️
              </p>

              <h3 className="mt-3 font-semibold text-gray-900">
                Image Tools
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Convert and compress
                image files.
              </p>
            </Link>

            <Link
              href="/tools/pdf/pdf-to-word"
              className="rounded-2xl border border-gray-200 p-5 transition hover:border-blue-500 hover:bg-blue-50"
            >
              <p className="text-2xl">
                ⚡
              </p>

              <h3 className="mt-3 font-semibold text-gray-900">
                PDF to Word
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Quickly convert a PDF
                into an editable Word file.
              </p>
            </Link>
          </div>
        </div>
        {/* Recent conversions */}
        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Recent Conversions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your latest DocMaster activity.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
                {totalConversions} total
              </span>

              <Link
                href="/history"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600"
              >
                View All History
              </Link>
            </div>
          </div>

          {recentConversions.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="font-medium text-gray-700">
                No conversions yet
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Your conversion history will appear here after you use a tool.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="px-4 py-3 font-medium">
                      Tool
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Original File
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Output File
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentConversions.map(
                    (conversion) => (
                      <tr
                        key={conversion.id}
                        className="border-b border-gray-100 text-sm"
                      >
                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700">
                            {conversion.tool}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {conversion.original_file_name}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {conversion.output_file_name}
                        </td>

                        <td className="px-4 py-4 text-gray-500">
                          {new Date(
                            conversion.created_at
                          ).toLocaleString()}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}