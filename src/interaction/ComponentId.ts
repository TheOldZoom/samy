export interface ComponentId {
  feature: string;
  action: string;
  id?: string;
}

export function parseComponentId(customId: string): ComponentId | null {
  const parts = customId.split(":");

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const [feature, action, id] = parts;

  if (!feature || !action) {
    return null;
  }

  return {
    feature,
    action,
    ...(id ? { id } : {}),
  };
}
