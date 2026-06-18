export function resolveProductQuery(id) {
  return id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { legacyId: +id };
}
