export type InventoryItem = { id: string; label: string; quantity: number };

export function itemCount(items: readonly InventoryItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
