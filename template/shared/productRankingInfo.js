// Defensive handling of old API payloads: product details render one actual product placement.
export function highestProductRanking(rows = []) {
  return rows
    .filter(
      (item) =>
        item &&
        item.entity_type !== "shop" &&
        Number.isInteger(Number(item.rank)) &&
        Number(item.rank) > 0
    )
    .reduce(
      (best, item) =>
        !best || Number(item.rank) < Number(best.rank) ? item : best,
      null
    );
}
