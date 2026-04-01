import { db } from "@/lib/db";
import { listings, categories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ListingForm from "@/components/ListingForm";
import { updateListing } from "@/lib/actions";

async function handleUpdate(formData: FormData) {
  "use server";
  const imageUrls = formData.get("imageUrls") as string;
  if (!imageUrls) {
    formData.delete("imageUrls");
  }
  await updateListing(formData);
}

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, id), eq(listings.userId, session.user.id)),
  });

  if (!listing) notFound();

  const allCategories = await db.select().from(categories);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Listing</h1>
      <ListingForm
        categories={allCategories}
        action={handleUpdate}
        defaultValues={listing}
      />
    </div>
  );
}
