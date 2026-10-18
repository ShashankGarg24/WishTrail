export default function PromotionCard({ promotion = {} }) {
  return (
    <article className="admin-promotion-card">
      <div className="admin-preview-brand">WishTrail</div>
      <h3>{promotion.title || "Promotion title"}</h3>
      <p>{promotion.subtitle || "Your promotion subtitle"}</p>
      {promotion.offerCopy && <strong>{promotion.offerCopy}</strong>}
      <span className="admin-button admin-button-primary">
        {promotion.ctaLabel || "Learn more"}
      </span>
    </article>
  );
}
