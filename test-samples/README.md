# DeliveryCheck — Test Samples

This directory contains reproducible test cases using controlled photographs and one-page PDF delivery notes.

Each test folder includes a packing list and photographs representing different delivery conditions. The application analyzes uploaded files dynamically; no results are hardcoded.

## Test 01 — Delivery Note 01

**Document:** `Test_01/Delivery_Note_01.pdf`

Expected quantities:

| Product SKU | Quantity |
|---|---:|
| BM-FM-35-0500 | 3 |
| BM-FM-15-0500 | 2 |
| BB-SY-25-0150 | 3 |
| AF-GY-10-0200 | 1 |
| GH-CC-45-0250 | 2 |

**`Correct_DN01.jpg`**

All 11 physical units are present, with readable SKU labels.

Expected: all five rows confirmed, without discrepancies.

**`Unverified_DN01.jpg`**

Three 3.5% milk bottles are physically present, but only one complete SKU is independently readable. The photograph also contains two strawberry yogurts instead of three.

Expected: visible shortfalls for milk (1/3 readable) and strawberry yogurt (2/3). Unconfirmed quantities must not be reported as definitely missing.

### Separate Parts

Select **Delivery in separate parts** and upload:

- `Part_01_DN01.jpg`
- `Part_02_DN01.jpg`
- `Part_03_DN01.jpg`

The 11 units are distributed across three non-overlapping photographs. Each physical item appears in exactly one image.

Expected: combined counts match the packing list.

**Alternative error scenario:** Replace only `Part_03_DN01.jpg` with `Part_03_Wrong_SKU_DN01.jpg`.

Expected: the cheddar quantity is unverified, and the substituted butter SKU is reported as unexpected.

## Test 02 — Delivery Note 02

**Document:** `Test_02/Delivery_Note_02.pdf`

Expected quantities:

| Product SKU | Quantity |
|---|---:|
| CH-SC-16-0200 | 2 |
| GH-CB-82-0200 | 1 |
| CH-CT-05-0200 | 3 |

**`Correct_DN02.jpg`**

All six ordered units are present.

Expected: all three rows confirmed.

**`Mixed_Errors_DN02.jpg`**

Physical contents:
- Clover Home Sour Cream: 1
- Golden Hearth Cultured Butter: 2
- Clover Home Cottage Cheese: 3
- Unexpected Sunny Spoon Sour Cream: 1

Expected: sour cream visible shortfall (1/2), extra butter (2/1), cottage cheese confirmed (3/3), and one unexpected SKU (`SS-SC-20-0200`).

### Corrected Delivery Example

First analyze `Mixed_Errors_DN02.jpg`, then replace it with `Correct_DN02.jpg` and run a new analysis.

The second photograph represents the corrected delivery. This is a new independent verification, not automatic tracking of corrections.

## Test 03 — Delivery Note 04

**Document:** `Test_03/Delivery_Note_04.pdf`

Ordered quantity: 2 × `GH-CC-45-0250` (Cheddar Cheese).

**`Correct_DN04.jpg`**

Two readable cheddar packages.

Expected: confirmed count (2/2).

**`Mixed_Errors_DN04.jpg`**

Two cheddar packages are physically present, but one label is obscured by an unexpected butter package (`GH-CB-82-0200`).

Expected: only independently readable cheddar SKUs are confirmed; the remaining cheddar quantity is unverified. Butter is reported as an unexpected SKU.

## Capture and Verification Rules

- **Single overview:** one image contains the complete delivery.
- **Separate parts:** up to three photographs cover non-overlapping sections; no physical unit may appear in more than one photograph.
- Only independently readable printed SKUs provide positive identity evidence.
- Unreadable or obscured labels are not proof of missing goods.
- Evidence coordinates are approximate and should be checked against the photographs.

These are expected findings based on the controlled test setup. Actual application outputs, processing times and estimated API costs are documented separately after testing.
