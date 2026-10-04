# DeliveryCheck — Test Samples

This directory contains a small, reproducible test dataset for DeliveryCheck, including controlled delivery photographs and one-page text-based PDF packing lists.

The dataset demonstrates correct deliveries, quantity discrepancies, unexpected SKUs, incomplete visual evidence, corrected deliveries, and multi-photo verification.

All test photographs use printed SKU labels. The application processes uploaded files dynamically; results are not hardcoded for these examples.

---

## Test 01 — Delivery Note 01

**Document:** `Test_01/Delivery_Note_01.pdf`

### Expected Quantities

| SKU | Product | Quantity |
|---|---|---:|
| BM-FM-35-0500 | Fresh Milk 3.5% | 3 |
| BM-FM-15-0500 | Fresh Milk 1.5% | 2 |
| BB-SY-25-0150 | Strawberry Yogurt | 3 |
| AF-GY-10-0200 | Greek Yogurt | 1 |
| GH-CC-45-0250 | Cheddar Cheese | 2 |
| **Total** | | **11** |

### Scenario A — Correct Delivery

**File:** `Correct_DN01.jpg`

All 11 ordered units are present with independently readable SKU labels.

**Expected:** All five document rows confirmed, with no discrepancies or unverified quantities.

### Scenario B — Incomplete Visual Evidence

**File:** `Unverified_DN01.jpg`

Physical contents:
- Fresh Milk 3.5%: 3 bottles, but only one complete SKU is independently readable.
- Fresh Milk 1.5%: 2 bottles with readable SKUs.
- Strawberry Yogurt: 2 units instead of 3 ordered.
- Greek Yogurt: 1 unit.
- Cheddar Cheese: 2 units.

**Expected:**
- Milk 3.5%: 1/3 independently readable labels — unverified remaining quantity.
- Milk 1.5%: 2/2 — confirmed.
- Strawberry Yogurt: 2/3 — visible shortfall.
- Greek Yogurt: 1/1 — confirmed.
- Cheddar: 2/2 — confirmed.

The application must not treat unreadable or unseen SKUs as proof that physical goods are missing.

### Scenario C — Delivery in Separate Parts

**Files:**
- `Separate_Parts/Part_01_DN01.jpg`
- `Separate_Parts/Part_02_DN01.jpg`
- `Separate_Parts/Part_03_DN01.jpg`

The delivery is divided into three non-overlapping photographs. Each physical package appears in exactly one photograph.

**Expected:** Combined evidence confirms all 11 ordered units across five document rows.

### Scenario D — Separate Parts with Unexpected Products

Replace only the third photograph with:

`Separate_Parts/Part_03_Wrong_SKU_DN01.jpg`

Keep Part 01 and Part 02 unchanged.

**Expected:**
- Four document rows confirmed.
- Cheddar: 0/2 confirmed from readable SKU evidence; quantity remains unverified, not declared missing.
- Two unexpected occurrences of butter SKU `GH-CB-82-0200`.
- Overall delivery requires review.

---

## Test 02 — Delivery Note 02

**Document:** `Test_02/Delivery_Note_02.pdf`

### Expected Quantities

| SKU | Product | Quantity |
|---|---|---:|
| CH-SC-16-0200 | Clover Home Sour Cream 16% | 2 |
| GH-CB-82-0200 | Golden Hearth Cultured Butter 82% | 1 |
| CH-CT-05-0200 | Clover Home Cottage Cheese 5% | 3 |
| **Total** | | **6** |

### Scenario A — Correct Delivery

**File:** `Correct_DN02.jpg`

All six ordered units are present with readable SKU labels.

**Expected:** All three document rows confirmed, without discrepancies.

### Scenario B — Mixed Errors

**File:** `Mixed_Errors_DN02.jpg`

Physical contents:
- Clover Home Sour Cream 16%: 1 unit.
- Golden Hearth Cultured Butter 82%: 2 units.
- Clover Home Cottage Cheese 5%: 3 units.
- Sunny Spoon Sour Cream 20%: 1 unexpected unit.

**Expected:**
- Clover Home Sour Cream: 1/2 — visible shortfall, remaining quantity unverified.
- Cultured Butter: 2/1 — one extra unit.
- Cottage Cheese: 3/3 — confirmed.
- Sunny Spoon Sour Cream SKU `SS-SC-20-0200`: one unexpected occurrence.

This scenario demonstrates simultaneous quantity discrepancies and an unexpected, similarly named product.

### Scenario C — Corrected Delivery

Use the same packing list for two independent analyses:

1. Analyze `Mixed_Errors_DN02.jpg` to identify the discrepancies.
2. Replace the photograph with `Correct_DN02.jpg`.
3. Run a new verification.

**Expected:** The corrected photograph produces three confirmed rows with no discrepancies.

Both photographs were tested independently. The application does not automatically track corrections between analyses.

---

## Test 03 — Delivery Note 04

**Document:** `Test_03/Delivery_Note_04.pdf`

### Expected Quantities

| SKU | Product | Quantity |
|---|---|---:|
| GH-CC-45-0250 | Golden Hearth Cheddar Cheese 45% | 2 |
| **Total** | | **2** |

### Scenario A — Correct Delivery

**File:** `Correct_DN04.jpg`

Two cheddar packages with readable SKU labels.

**Expected:** Confirmed count (2/2), with no discrepancies.

### Scenario B — Mixed Errors

**File:** `Mixed_Errors_DN04.jpg`

Two cheddar packages are physically present, but one SKU is obscured by an additional butter package.

The additional product is Golden Hearth Cultured Butter, SKU `GH-CB-82-0200`, which is not listed in the delivery note.

**Expected:**
- Cheddar: 1/2 independently readable SKUs — remaining quantity unverified.
- Cultured Butter: one unexpected SKU.
- Overall status: review required.

The obscured label must not trigger an unsupported missing-item conclusion.

---

## Capture and Verification Rules

DeliveryCheck supports two photograph capture conventions:

**Single Overview Photo**

One photograph shows the complete delivery, with each physical package appearing once.

**Delivery in Separate Parts**

Up to three photographs show non-overlapping sections of the same delivery. Each physical package must appear in only one photograph.

The application does not track individual physical objects across overlapping photographs. Following the capture convention is necessary to avoid double-counting.

### Evidence Policy

- Positive identity evidence requires an independently readable printed SKU.
- Product appearance alone is not sufficient for SKU confirmation.
- Matching is based on exact printed SKU values.
- Repeated independently readable labels are counted as separate occurrences.
- Unexpected readable SKUs are reported separately.
- Unreadable labels and missing camera coverage do not establish physical absence.
- Incomplete evidence produces an unverified finding rather than a definitive missing-item claim.
- Each finding references the relevant document row or explicitly identifies an unexpected SKU, with supporting photographic evidence where available.

---

## Actual Test Results

The following tests were performed on the deployed browser application on October 4, 2026, using `gpt-5.4-mini`.

Processing times and estimated API costs are measurements reported by the application, not performance targets.

### Results Summary

| Test Case | Confirmed | Discrepancies | Unverified | Time | Estimated API Cost | Outcome |
|---|---:|---:|---:|---:|---:|---|
| DN01 — Correct | 5/5 | 0 | 0 | 7.3s | $0.00314 | Pass |
| DN01 — Unverified, Run 1 | 2/5 | 0 | 3 | 9.3s | $0.00419 | Partial |
| DN01 — Unverified, Run 2 | 3/5 | 0 | 2 | 7.6s | $0.00251 | Pass |
| DN01 — Separate Parts | 5/5 | 0 | 0 | 14.8s | $0.01042 | Pass |
| DN01 — Separate Parts, Wrong SKU | 4/5 | 1 | 1 | 13.8s | $0.00862 | Pass |
| DN02 — Correct | 3/3 | 0 | 0 | 6.7s | $0.00398 | Pass |
| DN02 — Mixed Errors | 1/3 | 2 | 1 | 6.8s | $0.00419 | Pass |
| DN04 — Correct | 1/1 | 0 | 0 | 6.6s | $0.00311 | Pass |
| DN04 — Mixed Errors | 0/1 | 1 | 1 | 6.4s | $0.00314 | Pass |

**Interpretation:** Confirmed and Unverified refer to packing-list rows. Discrepancies represent reported issues, including extra units and unexpected SKUs. An unexpected SKU is not an additional packing-list row.

### Findings

**Correct Deliveries**

All three correct-delivery scenarios matched their packing lists:

- DN01: 11/11 units across five rows.
- DN02: 6/6 units across three rows.
- DN04: 2/2 units across one row.

No discrepancies or unverified rows were reported in these cases.

**Incomplete Evidence and Model Variability**

The DN01 incomplete-evidence photograph contains three milk bottles labelled 3.5%, but only one complete SKU is independently readable. The application correctly left the remaining quantity unverified rather than reporting it as missing.

In the first analysis, the vision model also failed to detect one readable 1.5% milk label, producing three unverified rows instead of the expected two.

A second analysis of the same photograph detected both 1.5% milk labels and produced the expected result.

This demonstrates that vision-model extraction is not perfectly repeatable. Both runs are reported rather than presenting only the successful result.

**Multi-Photo Verification**

The three-photo DN01 test confirmed all 11 ordered units, correctly combining observations from three non-overlapping views.

Replacing the third photograph with the wrong-SKU alternative resulted in four confirmed rows, one unverified cheddar row and two unexpected butter SKU occurrences.

This demonstrates correct aggregation of evidence across separate photographs under the stated capture convention.

**Mixed Discrepancies**

DN02 correctly identified the visible sour cream shortfall, extra butter, confirmed cottage cheese and unexpected Sunny Spoon SKU.

DN04 correctly identified one readable cheddar SKU out of two ordered and one unexpected butter SKU.

In both scenarios, insufficient visual evidence was treated conservatively.

**Corrected Delivery**

The DN02 mixed-error and correct photographs provide a reproducible correction scenario.

Both inputs were independently tested. Replacing the incorrect photograph and running a new analysis produced three confirmed document rows.

The prototype does not automatically track physical corrections or compare historical analyses.

---

## Known Limitations

**Vision-model variability**

The model may occasionally miss readable labels or produce different observations when analyzing the same photograph again.

**Approximate evidence coordinates**

The vision model estimates the location of printed SKUs. The highlighted rectangles can be vertically misaligned with the actual printed text, even when SKU recognition is correct.

**Limited visual verification**

The application validates independently readable SKU evidence, not all physical objects. A package with an obscured label cannot be fully verified.

**Capture convention dependency**

Separate Parts mode assumes that photographs do not overlap. Cross-photo physical-object tracking is not implemented.

**Image quality**

Small, blurred, rotated or partially covered SKU labels may reduce recognition accuracy.

**Scope**

The prototype targets controlled deliveries containing clearly labelled products. General retail-product recognition, warehouse integrations and automatic supplier complaints are outside scope.

These tests demonstrate behavior on the supplied controlled dataset, not general recognition accuracy across arbitrary deliveries.

---

## Processing Time and Cost

**Vision model:** `gpt-5.4-mini`

**API:** OpenAI Responses API

**Recognition requests:** One model request per photograph.

The application estimates variable API costs using the following standard token prices:

| Token Type | Price per 1M Tokens |
|---|---:|
| Input | $0.75 |
| Cached input | $0.075 |
| Output | $4.50 |

Estimated costs are based on reported token usage and the configured pricing assumptions.

The application uses the vision model for SKU extraction and deterministic application logic for reconciliation. No additional AI reasoning call, speech service or paid intermediary was used during these measured tests.

Three-photo checks require three recognition requests and therefore generally cost more than single-photo checks.

**Hosting:** Vercel Hobby. Hosting usage is separate from the reported variable OpenAI API costs. The Hobby deployment had no separately measured hosting charge for these test runs; this does not imply that hosting is universally free or without usage limits.

Failures and retries can generate additional API usage. Any cost from a paid call whose response is lost may not be measurable by the application.

---

## Reproducibility

To reproduce a test:

1. Open the DeliveryCheck browser application or run it locally using the root project README.
2. Upload the PDF from the corresponding test folder.
3. Select Single Overview or Delivery in Separate Parts, as specified.
4. Upload the relevant photograph or photographs.
5. Confirm the capture convention.
6. Run **Check delivery**.
7. Compare the report against the expected findings and measured examples above.

New photographs and packing lists are analyzed dynamically. No sample-specific answers are hardcoded into the application.

Model outputs may vary between runs, so results should be evaluated against independently visible SKU evidence rather than assumed to be identical on every execution.
