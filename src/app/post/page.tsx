import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ListingForm from "@/components/ListingForm";
import { createListing } from "@/lib/actions";

export default async function PostListingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allCategories = await db.select().from(categories);

  async function handleCreate(formData: FormData) {
    "use server";
    const imageUrls = formData.get("imageUrls") as string;
    if (!imageUrls) {
      formData.delete("imageUrls");
    }
    await createListing(formData);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Post an Item for Rent
      </h1>
      <ListingForm categories={allCategories} action={handleCreate} />
    </div>
  );
}
