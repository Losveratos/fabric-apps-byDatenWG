# Demo data · Vertriebscontrolling

Excel sources of the model `Vertriebscontrolling_Excel_based_3.0`:

| File | Content |
| --- | --- |
| `<yyyymmdd>_SalesListe.xlsx` (7 files, 2022-10-31 … 2023-04-30) | monthly snapshots of the sales pipeline, Excel table `Tabelle1`, 9,337 offers each |
| `Forecast.xlsx` | forecast list, sheet `FC Ffor Power BI` |

Set the model parameter `Source` to the absolute path of this folder (with a trailing backslash) and refresh. The model
reads **every** file whose name contains `SalesL` as one snapshot (`Pipeline Status` = date in the file name) and uses
`20230331_SalesListe.xlsx` for customers, status and sales reps, so keep only these files here.

Demo data: customers are fictitious company names, sales reps are first names only, products are coffee machines,
beans and trainings. The amounts of earlier snapshots are randomly varied on purpose (the model multiplies closed
offers by a random factor on refresh). Filter the offers on `'Pipeline Status'[Sort Order] = 0` for the current state.
