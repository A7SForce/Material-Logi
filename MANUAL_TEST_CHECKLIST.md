# Manual Test Checklist — one-thumb physical device (G4)

How to use: hold your phone one-handed, thumb only, no repositioning grip. For each
row, attempt the task and mark Pass/Fail, then write what hurt in Comment — be specific
("had to stretch to top-right", "button too close to tab bar", "text too small to read
at arm's length"). Fails become layout bugs against `src/index.css`/screens.

Device: ______________ Date: __________ Tester: __________

| # | Screen | Task (thumb only) | Pass / Fail | Comment for improvement |
|---|---|---|---|---|
| 1 | Projects | Import a BOM file and open the project without a second hand | | |
| 2 | Dashboard | Read Ready/Blocked status, totals, and recent changes at a glance | | |
| 3 | BOM | Edit a quantity, see the 🔒 indicator, save — all thumb-reachable | | |
| 4 | Confirm | Approve one item and dismiss another, thumb only | | |
| 5 | Suppliers | Open Browse All Suppliers, search, link a supplier, thumb only | | |
| 6 | PO (blocked) | With open confirmations, confirm tapping PO lands on Confirm | | |
| 7 | PO (open) | Resolved: generate the PDF and reach the WhatsApp button | | |
| 8 | Tab bar | Switch every tab mid-flow without shifting grip | | |

Pass = all 8 one-handed. Anything needing grip-shift or two hands is a bug, not "small screen" hardship.
