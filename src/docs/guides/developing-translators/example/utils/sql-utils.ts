/**
 * Escapes a field name for SQL usage, optionally with an alias.
 * @param field The field name to escape.
 * @param alias Optional alias for the field's table.
 * @returns The escaped field name.
 */
export function escapeField(field: string, alias?: string): string {
  const escape = (str: string) => `\`${str.replace(/`/g, '``')}\``;
  return alias ? `${escape(alias)}.${escape(field)}` : escape(field);
}
