import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Rating = { average: number; count: number };

function starString(average: number) {
  const filled = Math.round(average);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function ratingLabel(rating: Rating | undefined) {
  if (!rating || rating.count === 0) return "no reviews";
  return `${rating.average.toFixed(1)} (${rating.count})`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

const rateSchema = z.object({
  dishId: z.string().min(1),
  stars: z.preprocess((val) => {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^-?\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
      }
    }
    return val;
  }, z.number().int().min(1).max(5)),
  body: z
    .string()
    .max(500, "Review comment cannot exceed 500 characters.")
    .optional()
    .transform((val) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : null;
    }),
});

async function rateDish(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "STUDENT") {
    throw new Error("Unauthorized: Only signed-in students can rate dishes.");
  }

  const parsed = rateSchema.safeParse({
    dishId: formData.get("dishId"),
    stars: formData.get("stars"),
    body: formData.get("body") ?? undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid rating: stars must be an integer from 1 to 5.");
  }

  const currentDish = await prisma.menuItem.findUnique({
    where: { id: parsed.data.dishId },
    select: { id: true, active: true },
  });

  if (!currentDish || !currentDish.active) {
    notFound();
  }

  await prisma.review.upsert({
    where: {
      userId_menuItemId: {
        userId: currentUser.id,
        menuItemId: currentDish.id,
      },
    },
    update: {
      stars: parsed.data.stars,
      body: parsed.data.body,
    },
    create: {
      userId: currentUser.id,
      menuItemId: currentDish.id,
      stars: parsed.data.stars,
      body: parsed.data.body,
    },
  });

  revalidatePath(`/dishes/${currentDish.id}`);
  revalidatePath("/");
  redirect(`/dishes/${currentDish.id}?saved=1`);
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const dish = await prisma.menuItem.findUnique({
    where: { id: params.id },
    select: { name: true, active: true },
  });

  if (!dish || !dish.active) {
    notFound();
  }

  return {
    title: `${dish.name} | Messline`,
  };
}

export default async function DishPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { saved?: string };
}) {
  const dish = await prisma.menuItem.findUnique({
    where: { id: params.id },
  });

  if (!dish || !dish.active) {
    notFound();
  }

  const ratingAgg = await prisma.review.aggregate({
    where: { menuItemId: dish.id },
    _avg: { stars: true },
    _count: { stars: true },
  });

  const rating: Rating | undefined =
    ratingAgg._count.stars > 0 && ratingAgg._avg.stars != null
      ? { average: ratingAgg._avg.stars, count: ratingAgg._count.stars }
      : undefined;

  const user = await getCurrentUser();
  const isStudent = user?.role === "STUDENT";

  const existingReview = isStudent
    ? await prisma.review.findUnique({
        where: {
          userId_menuItemId: {
            userId: user.id,
            menuItemId: dish.id,
          },
        },
      })
    : null;

  const reviews = await prisma.review.findMany({
    where: { menuItemId: dish.id },
    select: {
      id: true,
      stars: true,
      body: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="mb-6 text-sm">
        <Link href="/" className="underline">
          Back to home
        </Link>
      </p>

      <h1 className="text-2xl font-semibold">{dish.name}</h1>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        {dish.description}
      </p>

      <div className="mt-4 space-y-2 text-sm">
        <p>
          <span className="font-medium text-neutral-900">Ingredients:</span>{" "}
          <span className="text-neutral-700">{dish.ingredients}</span>
        </p>
        <p>
          <span className="font-medium text-neutral-900">Rating:</span>{" "}
          {rating ? (
            <>
              <span aria-hidden="true" className="text-amber-500">
                {starString(rating.average)}
              </span>{" "}
              <span className="text-neutral-700">{ratingLabel(rating)}</span>
            </>
          ) : (
            <span className="text-neutral-700">no reviews</span>
          )}
        </p>
      </div>

      {searchParams?.saved === "1" && (
        <p role="status" className="mt-4 text-sm font-medium">
          Saved.
        </p>
      )}

      {isStudent && (
        <form
          action={rateDish}
          className="mt-8 border-t border-neutral-200 pt-6"
        >
          <input type="hidden" name="dishId" value={dish.id} />
          <fieldset>
            <legend className="text-sm font-medium text-neutral-900">
              Rate this dish
            </legend>
            <div className="mt-3 flex items-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <label
                  key={star}
                  htmlFor={`star-${star}`}
                  className="flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <input
                    id={`star-${star}`}
                    type="radio"
                    name="stars"
                    value={star}
                    defaultChecked={existingReview?.stars === star}
                    required
                  />
                  <span>
                    {star} {star === 1 ? "star" : "stars"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4">
            <label
              htmlFor="review-body"
              className="block text-sm font-medium text-neutral-900"
            >
              Comment (optional)
            </label>
            <textarea
              id="review-body"
              name="body"
              rows={3}
              maxLength={500}
              defaultValue={existingReview?.body ?? ""}
              placeholder="Add a comment (optional)..."
              className="mt-1 block w-full rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="mt-4 rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
          >
            Submit rating
          </button>
        </form>
      )}

      <section className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-semibold text-neutral-900">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No reviews yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200">
            {reviews.map((rev) => (
              <li key={rev.id} className="py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-900">
                    {rev.user.name}
                  </span>
                  <span className="text-neutral-500">
                    {formatDate(rev.createdAt)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-neutral-700">
                  <span className="font-medium">{rev.stars} / 5 stars</span>
                </div>
                {rev.body && (
                  <p className="mt-2 text-sm text-neutral-700 whitespace-pre-wrap">
                    {rev.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
