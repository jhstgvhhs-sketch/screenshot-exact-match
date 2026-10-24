export type PublicReview = {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  source?: string;
};
export function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <p className="font-semibold">
        {review.author_name}
        {review.source === "admin" && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (feedback cadastrado pela loja)
          </span>
        )}
      </p>
      <p aria-label={`${review.rating} de 5 estrelas`} className="mt-2 text-primary">
        {"★".repeat(review.rating)}
        {"☆".repeat(5 - review.rating)}
      </p>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
        {review.comment}
      </p>
    </article>
  );
}
