"use client";

export default function DeleteListingButton({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="flex-1">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        onClick={(e) => {
          if (!confirm("Delete this listing?")) e.preventDefault();
        }}
      >
        Delete
      </button>
    </form>
  );
}
