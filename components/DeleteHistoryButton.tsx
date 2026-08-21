"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteHistoryButtonProps = {
  id: number;
  fileName: string;
};

export default function DeleteHistoryButton({
  id,
  fileName,
}: DeleteHistoryButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete conversion history for "${fileName}"?`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(
        "/api/history/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to delete conversion."
        );
      }

      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete conversion."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDeleting
          ? "Deleting..."
          : "Delete"}
      </button>

      {error && (
        <p className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}