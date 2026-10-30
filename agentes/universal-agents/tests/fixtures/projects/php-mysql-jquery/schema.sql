CREATE TABLE inventory_items (
  id BIGINT PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0)
);
