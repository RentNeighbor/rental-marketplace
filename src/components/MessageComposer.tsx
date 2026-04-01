"use client";

import { useActionState, useRef } from "react";

interface MessageComposerProps {
  conversationId: string;
  submitAction: (formData: FormData) => Promise<void>;
}

export default function MessageComposer({
  conversationId,
  submitAction,
}: MessageComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);

  async function formAction(_prevState: string | null, formData: FormData) {
    try {
      await submitAction(formData);
      formRef.current?.reset();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Something went wrong";
    }
  }

  const [error, action, isPending] = useActionState(formAction, null);

  return (
    <div className="border-t border-gray-200 pt-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-2.5 rounded text-xs mb-3">
          {error}
        </div>
      )}
      <form ref={formRef} action={action} className="flex gap-2">
        <input type="hidden" name="conversationId" value={conversationId} />
        <textarea
          name="body"
          required
          rows={1}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
