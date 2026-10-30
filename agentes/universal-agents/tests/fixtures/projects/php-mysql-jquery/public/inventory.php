<?php
// Synthetic PHP/MySQL/jQuery fixture. No database connection is made.
function item_label(array $row): string {
    return htmlspecialchars((string)($row['label'] ?? ''), ENT_QUOTES, 'UTF-8');
}
