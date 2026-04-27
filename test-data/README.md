# Test Data

## Supplier Inventory CSV

Use `supplier-inventory-sample.csv` to test the supplier import flow against the seeded Partify catalog.

Expected flow:

1. Log in as a supplier.
2. Complete supplier onboarding if needed.
3. Go to `Supplier -> Inventory -> Import CSV`.
4. Upload `test-data/supplier-inventory-sample.csv`.
5. Review the import job.
6. Approve matched rows.
7. Search as a client for one of the seeded parts, such as `BP-4567`.

The sample uses seeded catalog part numbers:

- `BP-4567` - Front Brake Pads
- `OF-8921` - Oil Filter
- `SP-1234` - Spark Plugs
- `AF-5678` - Air Filter
- `WP-9012` - Water Pump

This data is for local/staging testing and can be removed before a real launch dataset is loaded.
