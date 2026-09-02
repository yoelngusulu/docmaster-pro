import Link from "next/link";
import { redirect } from "next/navigation";

import DeleteHistoryButton from "@/components/DeleteHistoryButton";
import { createClient } from "@/lib/supabase/server";

type Conversion = {
  id: number;
  tool: string;
  original_file_name: string;
  output_file_name: string;
  created_at: string;
};

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              DocMaster
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              Conversion History
            </h1>

            <p className="mt-2 text-gray-600">
              View all your previous DocMaster
              conversions.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Summary */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Total Conversions
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {history.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Account
            </p>

            <p className="mt-2 truncate text-lg font-semibold text-gray-900">
              {user.email}
            </p>
          </div>
        </div>

        {/* History */}
        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                All Conversions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your complete conversion activity.
              </p>
            </div>

            <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
              {history.length} total
            </span>
          </div>

          {conversionsError ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="font-medium text-red-700">
                Unable to load your conversion
                history.
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <div className="text-4xl">
                📄
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No conversions yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Your conversion history will
                appear here after you use a
                DocMaster tool.
              </p>

              <Link
                href="/tools/pdf"
                className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Start Converting
              </Link>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="px-4 py-4 font-medium">
                      #
                    </th>

                    <th className="px-4 py-4 font-medium">
                      Tool
                    </th>

                    <th className="px-4 py-4 font-medium">
                      Original File
                    </th>

                    <th className="px-4 py-4 font-medium">
                      Output File
                    </th>

                    <th className="px-4 py-4 font-medium">
                      Date
                    </th>

                    <th className="px-4 py-4 font-medium">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {history.map(
                    (conversion, index) => (
                      <tr
                        key={conversion.id}
                        className="border-b border-gray-100 text-sm transition hover:bg-gray-50"
                      >
                        <td className="px-4 py-4 text-gray-500">
                          {index + 1}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-700">
                            {conversion.tool}
                          </span>
                        </td>

                        <td className="max-w-[220px] truncate px-4 py-4 text-gray-700">
                          {
                            conversion.original_file_name
                          }
                        </td>

                        <td className="max-w-[220px] truncate px-4 py-4 text-gray-700">
                          {
                            conversion.output_file_name
                          }
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                          {new Date(
                            conversion.created_at
                          ).toLocaleString()}
                        </td>

                        <td className="px-4 py-4">
                          <DeleteHistoryButton
                            id={conversion.id}
                            fileName={
                              conversion.original_file_name
                            }
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/tools/pdf"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + New Conversion
          </Link>
        </div>
      </div>
    </main>
  );
}