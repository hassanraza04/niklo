const STRONG_FIELDS = ["name", "area", "subcategory_name", "category_name", "subcategories"];

export type VenueSearchPlan = {
  statement: string;
  binds: Array<string | number>;
};

export function buildVenueSearchPlan(
  rawQuery: string,
  includeAddress: boolean,
  limit: number,
): VenueSearchPlan | null {
  const tokens = rawQuery
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[%_]/g, ""))
    .filter(Boolean)
    .slice(0, 6);
  if (!tokens.length) return null;

  const phrase = tokens.join(" ").toLowerCase();
  const fields = includeAddress ? [...STRONG_FIELDS, "address"] : STRONG_FIELDS;
  const clause = tokens
    .map(() => `(${fields.map((field) => `${field} like ?`).join(" or ")})`)
    .join(" and ");
  const binds: Array<string | number> = [];
  for (const token of tokens) {
    binds.push(...fields.map(() => `%${token}%`));
  }
  binds.push(
    phrase,
    `${phrase}%`,
    `%${phrase}%`,
    phrase,
    phrase,
    phrase,
    `%${phrase}%`,
    limit,
  );

  return {
    statement: `select * from venues
      where ${clause}
      order by case
        when lower(name) = ? then 0
        when lower(name) like ? then 1
        when lower(name) like ? then 2
        when lower(subcategory_name) = ? then 3
        when lower(category_name) = ? then 4
        when lower(area) = ? then 5
        when lower(address) like ? then 7
        else 6
      end,
      review_count desc nulls last, rating desc nulls last, name
      limit ?`,
    binds,
  };
}
