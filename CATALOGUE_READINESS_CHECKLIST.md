# Partify Catalogue Readiness Checklist

Purpose: make Partify's catalogue accurate enough for real users while keeping the database ready for large-scale part, supplier, and fitment data.

## P0 - Catalogue Accuracy Foundation
- [ ] Define canonical part fields: part number, OE number, brand, category, description, notes, images/documents later.
- [ ] Add structured OE number support, separate from supplier part numbers.
- [ ] Add structured brand/manufacturer support instead of storing brand in free text.
- [ ] Finalize `vehicle_catalog` as the master vehicle list for supported South African vehicles.
- [ ] Finalize `part_vehicle_fitments` as the source of truth for compatibility.
- [ ] Keep supplier inventory separate from catalogue data.
- [ ] Ensure suppliers upload stock/price against known parts, not uncontrolled duplicate parts.
- [ ] Add clear confidence/source fields for every fitment rule.
- [ ] Decide accepted fitment sources: Partify verified, supplier provided, JackCat verified, TecDoc later, manufacturer catalogue.

## P0 - Search Result Accuracy
- [ ] Make `Fits My Vehicle` use structured fitments only in live mode.
- [ ] Keep `All Parts` available for broader catalogue browsing.
- [ ] Show users when a result is verified for their vehicle.
- [ ] Hide uncertain results from `Fits My Vehicle` unless confidence threshold is met.
- [ ] Add fallback messaging when no compatible parts are found.
- [ ] Ensure part results only show suppliers with live stock.
- [ ] Ensure supplier results sort by best total cost, price, and distance correctly.

## P1 - Supplier Catalogue Uploads
- [ ] Update supplier CSV template to include supplier part number, OE number, brand, category, compatible vehicles, price, and stock.
- [ ] Separate catalogue import from inventory import.
- [ ] Catalogue import creates/updates canonical parts and aliases.
- [ ] Inventory import updates supplier stock and price only.
- [ ] Prevent duplicate canonical parts by normalized part number/OE number/brand.
- [ ] Detect unknown part numbers and send them to review instead of silently creating bad data.
- [ ] Build review flow for unmatched supplier parts.
- [ ] Store original raw upload values for audit/debugging.

## P1 - Fitment Import And Verification
- [ ] Build fitment CSV format for manual/JackCat-supported imports.
- [ ] Support year ranges, model families, exact models, engines, fuel type, body type.
- [ ] Add validation for impossible years, missing make/model, and duplicate fitments.
- [ ] Add fitment review screen or admin query workflow.
- [ ] Track fitment source and confidence per row.
- [ ] Add ability to deactivate bad fitment rules without deleting history.
- [ ] Add QA queries to test a vehicle and confirm expected compatible parts.

## P1 - Scale And Performance
- [ ] Ensure search never loads the full catalogue into the browser.
- [ ] Add pagination/infinite loading for catalogue search.
- [ ] Add query limits to all catalogue, popular, recent, and compatible search calls.
- [ ] Add full-text search indexes for part name, category, brand, OE number.
- [ ] Add indexes for normalized supplier part numbers and aliases.
- [ ] Add indexes for `part_vehicle_fitments` by make/model/year/engine.
- [ ] Add indexes for `supplier_inventory(part_id, stock)` and supplier inventory lookup.
- [ ] Monitor slow Supabase queries after catalogue growth.
- [ ] Test with at least 10k, 100k, then 1M synthetic catalogue rows before large import.

## P1 - Data Quality Controls
- [ ] Normalize part numbers consistently.
- [ ] Normalize OE numbers consistently.
- [ ] Normalize vehicle make/model/engine names.
- [ ] Create alias tables for common vehicle naming differences.
- [ ] Create alias tables for supplier part number differences.
- [ ] Add import warnings for suspiciously broad compatibility.
- [ ] Add import warnings for parts with no compatible vehicles.
- [ ] Add import warnings for fitments with no stocked suppliers.
- [ ] Add manual correction workflow for bad catalogue matches.

## P2 - JackCat Usage
- [ ] Confirm JackCat licence terms allow using it as a reference for Partify catalogue building.
- [ ] Confirm whether JackCat offers API/data export access.
- [ ] If no API, use JackCat as manual verification only.
- [ ] Document manual verification process using JackCat.
- [ ] Mark JackCat-verified fitments with source `jackcat_verified`.
- [ ] Avoid scraping or automated extraction unless explicitly licensed.

## P2 - Admin/Internal Tools
- [ ] Build admin-only catalogue dashboard.
- [ ] Build canonical part editor.
- [ ] Build vehicle catalogue editor.
- [ ] Build fitment editor.
- [ ] Build unmatched supplier part review queue.
- [ ] Build duplicate detection view.
- [ ] Build bad-fitment report workflow from user/support feedback.

## P2 - User Trust And UX
- [ ] Show compatibility confidence in a user-friendly way.
- [ ] Add "Report incorrect fitment" option later.
- [ ] Add "This part fits your vehicle" indicator on result cards.
- [ ] Add "Check carefully" warning for lower-confidence fitments if ever shown.
- [ ] Keep `All Parts` clearly separate from verified compatibility results.

## P3 - Future Data Integrations
- [ ] Prepare TecDoc import adapter shape.
- [ ] Prepare MAM/Autocat import adapter shape if pricing makes sense.
- [ ] Prepare manufacturer catalogue import format.
- [ ] Prepare supplier API/SFTP catalogue sync design.
- [ ] Add source-specific import logs and rollback strategy.

## Current Recommended Path
- [ ] Continue with internal fitment model.
- [ ] Use JackCat as a low-cost reference if licence terms allow it.
- [ ] Start with common Cape Town/South African vehicles and high-demand service parts.
- [ ] Build verified catalogue gradually from supplier uploads plus manual verification.
- [ ] Delay TecDoc until Partify has enough traction to justify the licence.
