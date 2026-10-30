package example;

public record InventoryItem(String id, String label, int quantity) {
    public InventoryItem {
        if (quantity < 0) throw new IllegalArgumentException("quantity must be non-negative");
    }
}
