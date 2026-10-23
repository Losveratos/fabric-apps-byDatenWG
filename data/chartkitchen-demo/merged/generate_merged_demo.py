# -*- coding: utf-8 -*-
"""
generate_merged_demo.py — Demo-Datengenerator "ChartKitchen byDatenWG (merged)".

Erzeugt alle in CONTRACT.md beschriebenen CSVs im selben Ordner:

    dim-konten.csv      1:1-Byte-Kopie aus demoData/industrial/
    fact-guv.csv        5.000 Konten x 36 Monate (2024-01 .. 2026-12) = 180.000 Zeilen
    sales-fact.csv      breiter Sales-Stern, 12 Produkte x 18 Laender x 48 Monate x 6 Szenarien
    dim-produkt.csv     12 Zeilen
    dim-markt.csv       18 Zeilen
    dim-szenario.csv     6 Zeilen
    dim-kpi.csv         11 Zeilen
    dim-ort.csv         60 Zeilen
    fact-klima.csv      10.560 Zeilen (60 Orte x 176 Jahre)
    dim-jahr.csv        176 Zeilen (1850-2025)
    gantt.csv           uebernommen, auf globalen Kontrakt umgestellt
    guv-wasserfall.csv  uebernommen, auf globalen Kontrakt umgestellt
    README.md
    reconciliation.txt

Nur Standardbibliothek. Kein Netzwerk. Seed fix 20260824.
Zweimaliges Ausfuehren erzeugt byte-identische Dateien.

================================================================================
TREND-ENGINE (Waermestreifen als Treiber) — kein weisses Rauschen
================================================================================

Ziel: Die Business-Zeitreihen sollen echte Autokorrelation, Trendbrueche und
Volatilitaets-Cluster zeigen. Reines random.gauss() liefert weisses Rauschen und
sieht in jedem Chart tot aus. Deshalb werden reale Klimareihen als Treiber
missbraucht:

1) QUELLE
   waermestreifen_demo.csv enthaelt 60 Orte x 176 Jahre (1850-2025) mit der
   Jahres-Temperaturanomalie AnomalieC. Je Ort wird die Reihe
   z-standardisiert:   z[i] = (x[i] - mean(x)) / stdev(x)
   -> 60 wiederverwendbare Signale mit realistischer Struktur (starke
   Autokorrelation, Regimewechsel um 1910/1945/1975, Vulkan-Ausreisser).

2) ZUORDNUNG
   Jede Business-Entitaet (Segment, Segment x Region, Konto, Produkt, Land,
   Produkt x Land) bekommt ueber sha256(SEED | key) deterministisch ein Paar
   (Ortsindex 0..59, Startjahr-Offset 0..39). Gleiche Entitaet -> gleiche Reihe,
   auch ueber mehrere Laeufe hinweg.

3) MAPPING
   Die letzten N Jahre der Reihe werden auf die N Monate der Business-Zeitachse
   gelegt (N = 48 Monate = 2023-01 .. 2026-12; 2023 ist das Schattenjahr, aus dem
   PY fuer 2024 entsteht):
       start = 176 - N - offset      z_bus[t] = z[start + t]
   Damit erbt die Monatsreihe die Autokorrelation der Jahresreihe.

4) UEBERLAGERUNG
   Der multiplikative Treiber ist eine gewichtete Mischung aus einem gemeinsamen
   Segment-/Kategorie-Signal, einem Regions-/Landes-Signal und einem
   idiosynkratischen Konto-/Produkt-Signal:

       zmix[t] = w_seg*z_seg[t] + w_reg*z_reg[t] + w_idio*z_idio[t]
       faktor[t] = exp(alpha * zmix[t])          alpha = 0.03 .. 0.12 je KPI-Gruppe

   Weil das Segment-Signal dominiert, reagieren alle Konten eines Segments
   sichtbar auf "ihre" Klimareihe (Story 9, Energiepreis-Kopplung) — nachpruefbar
   ueber die Pearson-Korrelation in der Selbstpruefung.

   Fuer die GuV wird der Treiber so normiert, dass sein Mittel ueber
   2026-01..2026-06 exakt 1 ist. Dadurch bleiben die Abnahmewerte des
   Alt-Datensatzes (Net revenue 1.664,6 mEUR usw.) in derselben Groessenordnung,
   waehrend 2024/2025 frei "atmen" duerfen.

   Darueber liegen zusaetzlich: Monats-Saisonalitaet, Wachstumstrend,
   Preis-/Mengen-Split, Szenario-Deltas (PL glatt, FC = Ist bis Redaktions-
   schluss + Rest-Plan) und die 10 explizit eingebauten Storys.

================================================================================
GUV-BASIS
================================================================================
dim-konten.csv ist eine Byte-Kopie und darf nicht neu erzeugt werden. Die
Wert-Parameter je Konto werden deshalb aus dem ALTEN fact-guv.csv
zurueckgerechnet:
    base  = mean_m( PL_m / SEASON_H1_m )     Monats-Planbasis 2026
    perf  = sum(AC) / sum(PL)                Ist/Plan-Performance (traegt Story 8)
    gp    = sum(PY) / sum(PL)                Jahresfaktor rueckwaerts
    dormant / midyear                        aus Nullen bzw. leeren PY-Feldern
Damit bleiben Groessenordnungen, Vorzeichen, ruhende Konten, Orphans,
Kommentar-Konten und die Segment-Story unveraendert erhalten.
"""

import csv
import hashlib
import math
import os
import shutil
import statistics
import sys

# ---------------------------------------------------------------------------
# Konstanten / Pfade
# ---------------------------------------------------------------------------
SEED = 20260824

OUT = os.path.dirname(os.path.abspath(__file__))
DEMO = os.path.dirname(OUT)                       # ...\demoData
SOURCES = os.path.join(DEMO, "sources")          # Eingaben: Klima, Gantt, Wasserfall

SRC_DIM_KONTEN = os.path.join(DEMO, "industrial", "dim-konten.csv")
SRC_FACT_GUV = os.path.join(DEMO, "industrial", "fact-guv.csv")
SRC_KLIMA = os.path.join(SOURCES, "waermestreifen_demo.csv")
SRC_GANTT = os.path.join(SOURCES, "gantt_demo_daten.csv")
SRC_WASSERFALL = os.path.join(SOURCES, "guv_wasserfall_demo.csv")

MEUR = 1_000_000.0

# Business-Zeitachse: 48 Monatspunkte 2023-01 .. 2026-12.
# 2023 ist Schattenjahr (liefert PY fuer 2024) und wird NICHT ausgegeben.
TL_Y0 = 2023
TL_N = 48
SHADOW = 12                       # Anzahl nicht ausgegebener Fuehrungsmonate (GuV)
GUV_FIRST = 12                    # Index von 2024-01
IDX_2026_01 = 36
IDX_2026_06 = 41
IDX_2026_08 = 43                  # letzter Ist-Monat "heute" = 2026-08-24

SEASON_H1 = [0.94, 0.90, 1.10, 0.98, 1.00, 1.12]   # Jan..Jun  (wie Alt-Generator)
SEASON_H2 = [0.92, 0.85, 1.08, 1.02, 1.04, 1.15]   # Jul..Dez
SEASON_12 = SEASON_H1 + SEASON_H2


def months(y0, n):
    """[(jahr, monat, 'YYYY-MM', 'YYYY-MM-01'), ...]"""
    out = []
    for t in range(n):
        y = y0 + t // 12
        m = t % 12 + 1
        out.append((y, m, "%04d-%02d" % (y, m), "%04d-%02d-01" % (y, m)))
    return out


TL = months(TL_Y0, TL_N)


def h64(*parts):
    s = str(SEED) + "|" + "|".join(str(p) for p in parts)
    return int.from_bytes(hashlib.sha256(s.encode("utf-8")).digest()[:8], "big")


def clamp(v, lo, hi):
    return lo if v < lo else (hi if v > hi else v)


def pearson(a, b):
    n = len(a)
    if n < 3:
        return 0.0
    ma, mb = sum(a) / n, sum(b) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in a))
    sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    if sa == 0 or sb == 0:
        return 0.0
    return sum((a[i] - ma) * (b[i] - mb) for i in range(n)) / (sa * sb)


# ---------------------------------------------------------------------------
# 1) Klimaquelle laden -> z-Signale der Trend-Engine
# ---------------------------------------------------------------------------
def load_klima():
    with open(SRC_KLIMA, "r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    order = []                     # [(Region, Ort)] in Reihenfolge des ersten Auftretens
    data = {}                      # (Region, Ort) -> dict
    for r in rows:
        key = (r["Region"], r["Ort"])
        if key not in data:
            order.append(key)
            data[key] = {
                "Region": r["Region"], "Ort": r["Ort"], "Land": r["Land"],
                "Breitengrad": r["Breitengrad"], "Laengengrad": r["Laengengrad"],
                "MittelC": r["MittelC_1961_1990"],
                "jahre": [], "anom": [],
            }
        data[key]["jahre"].append(int(r["Jahr"]))
        data[key]["anom"].append(float(r["AnomalieC"]))
    places = [data[k] for k in order]
    for i, p in enumerate(places):
        p["OrtID"] = "O%03d" % (i + 1)
        mu = statistics.fmean(p["anom"])
        sd = statistics.pstdev(p["anom"]) or 1.0
        p["z"] = [(x - mu) / sd for x in p["anom"]]
    return places


PLACES = load_klima()
N_PLACES = len(PLACES)
N_YEARS = len(PLACES[0]["z"])

# Ort-Namen eindeutig machen (Berlin/London/Moskau kommen in Europa UND Welt vor).
# Zweites Auftreten bekommt " (Welt)" angehaengt -> dim-ort.Ort ist Join-faehig.
_seen_names = {}
for p in PLACES:
    n = p["Ort"]
    if n in _seen_names:
        p["OrtName"] = "%s (%s)" % (n, p["Region"])
    else:
        p["OrtName"] = n
        _seen_names[n] = True


def zseries(key, n=TL_N):
    """Deterministisches z-Signal der Laenge n fuer einen beliebigen Schluessel."""
    h = h64("z", key)
    pi = h % N_PLACES
    off = (h >> 13) % 40
    start = N_YEARS - n - off
    z = PLACES[pi]["z"]
    return z[start:start + n], pi


_ZCACHE = {}


def zsig(key):
    if key not in _ZCACHE:
        _ZCACHE[key] = zseries(key)
    return _ZCACHE[key]


# ---------------------------------------------------------------------------
# 2) dim-konten.csv — 1:1-Byte-Kopie
# ---------------------------------------------------------------------------
shutil.copyfile(SRC_DIM_KONTEN, os.path.join(OUT, "dim-konten.csv"))

with open(SRC_DIM_KONTEN, "r", encoding="utf-8", newline="") as f:
    DIM_ROWS = list(csv.DictReader(f, delimiter=";"))
DIM_COLS = ["AccountID", "ParentAccountID", "Name", "L1", "L2", "L3", "L4", "L5", "L6",
            "SortOrder", "RowType", "FormulaDef", "SignConvention",
            "DisplayInvert", "VarianceInvert", "Kommentar"]

# Alt-Fakten einlesen -> Wertparameter je Konto
OLD = {}
with open(SRC_FACT_GUV, "r", encoding="utf-8", newline="") as f:
    for r in csv.DictReader(f, delimiter=";"):
        OLD.setdefault(r["AccountID"], []).append(r)


def fnum(s):
    return None if s == "" else float(s)


ACC = {}          # AccountID -> Parameter
for row in DIM_ROWS:
    aid = row["AccountID"]
    old = OLD[aid]
    pl = [fnum(o["PL"]) for o in old]
    ac = [fnum(o["AC"]) for o in old]
    py = [fnum(o["PY"]) for o in old]
    rowtype = row["RowType"]
    is_value_row = rowtype == "Account"

    bases = [pl[i] / SEASON_H1[i] for i in range(6) if pl[i] not in (None, 0.0)]
    base = statistics.fmean(bases) if bases else 0.0
    spl = sum(v for v in pl if v)
    sac = sum(v for v in ac if v)
    spy = sum(v for v in py if v)
    perf = (sac / spl) if spl else 1.0
    gp = (spy / spl) if spl else 0.93
    dormant = (base == 0.0)
    midyear = aid.endswith("-3140") and not dormant

    ACC[aid] = {
        "row": row,
        "sign": int(row["SignConvention"]),
        "l1": row["L1"], "l2": row["L2"], "l3": row["L3"],
        "rowtype": rowtype,
        "zero": (not is_value_row) or dormant,
        "dormant": dormant,
        "midyear": midyear,
        "base": base,
        "perf": clamp(perf, 0.70, 1.45),
        "gp": clamp(gp, 0.80, 1.05),
    }

# Kategorie / alpha / Treiberschluessel je Konto -----------------------------
SEG_OF_NAME = {"Industrial Automation": "IA", "Energy Systems": "ES",
               "Mobility Solutions": "MS", "Digital Services": "DS"}
ALPHA = {"REV": 0.060, "COGS": 0.095, "OPEX": 0.050, "OOR": 0.120,
         "DA": 0.030, "FIN": 0.100, "TAX": 0.045, "OTH": 0.055}


def classify(a):
    l1, l2, l3 = a["l1"], a["l2"], a["l3"]
    if l1 == "Net revenue":
        return "REV", l2 or "?", l3 or "?"
    if l1 == "Cost of goods sold":
        # MAT/FER: L3 = Segmentname; FRE: L3 = Segmentname; FRA: L3 = Region
        seg = l3 if l3 in SEG_OF_NAME else "Konzern"
        reg = l3 if l3 not in SEG_OF_NAME else (a["row"]["L4"] or "?")
        return "COGS", seg, reg
    if l1 == "Operating expenses":
        return "OPEX", l2 or "?", l3 or "?"
    if l1 == "Other operating result":
        return "OOR", "Konzern", l2 or "?"
    if l1 == "Depreciation & amortization":
        return "DA", "Konzern", l2 or "?"
    if l1 == "Financial result":
        return "FIN", "Konzern", "Konzern"
    if l1 == "Income taxes":
        return "TAX", "Konzern", "Konzern"
    return "OTH", "Konzern", "Konzern"


for aid, a in ACC.items():
    grp, seg, reg = classify(a)
    a["grp"], a["seg"], a["reg"] = grp, seg, reg
    a["alpha"] = ALPHA[grp]
    a["z_seg"] = "SEG|" + seg
    a["z_reg"] = "REG|" + seg + "|" + reg
    a["z_idio"] = "ACC|" + aid

W_SEG, W_REG, W_IDIO = 1.00, 0.42, 0.33
_NORM = math.sqrt(W_SEG ** 2 + W_REG ** 2 + W_IDIO ** 2)


def guv_driver(a):
    """48 multiplikative Treiberfaktoren, Mittel ueber 2026-H1 = 1."""
    zs, _ = zsig(a["z_seg"])
    zr, _ = zsig(a["z_reg"])
    zi, _ = zsig(a["z_idio"])
    mix = [(W_SEG * zs[t] + W_REG * zr[t] + W_IDIO * zi[t]) / _NORM for t in range(TL_N)]
    f = [math.exp(a["alpha"] * m) for m in mix]
    ref = statistics.fmean(f[IDX_2026_01:IDX_2026_06 + 1])
    return [x / ref for x in f], mix


# Story 2 — Lieferketten-Schock 2024-Q3/Q4 (COGS Material/Fracht), Erholung ab 2025-Q2
SUPPLY_SHOCK = {
    (2024, 7): 1.06, (2024, 8): 1.11, (2024, 9): 1.16,
    (2024, 10): 1.185, (2024, 11): 1.175, (2024, 12): 1.14,
    (2025, 1): 1.115, (2025, 2): 1.085, (2025, 3): 1.055,
    (2025, 4): 1.030, (2025, 5): 1.012, (2025, 6): 1.000,
}


def guv_shock(a, y, m):
    if a["grp"] != "COGS":
        return 1.0
    if a["l2"] not in ("Materialaufwand", "Frachten & Zölle"):
        return 1.0
    return SUPPLY_SHOCK.get((y, m), 1.0)


# Konsolidierung: Gesellschaft 3140 ab 2025-04 (Story 5)
MID_START = TL.index(next(x for x in TL if x[2] == "2025-04"))


def build_guv():
    """Erzeugt je Konto AC/PY/PL/FC (48 Monatspunkte) + FY-Skalare je Jahr."""
    for aid, a in ACC.items():
        n = TL_N
        if a["zero"]:
            a["PL"] = [0.0] * n
            a["AC"] = [0.0] * n
            a["PY"] = [0.0] * n
            a["FC"] = [0.0] * n
            a["mix"] = [0.0] * n
            continue

        drv, mix = guv_driver(a)
        a["mix"] = mix
        base, gp, perf = a["base"], a["gp"], a["perf"]

        PL = [None] * n
        AC = [None] * n
        for t, (y, m, _, _) in enumerate(TL):
            yf = gp ** (2026 - y)
            pl = base * yf * SEASON_12[m - 1]
            # Performance-Pfad: volle Story-Performance 2026, gedaempft rueckwaerts
            pw = 1.0 if y == 2026 else 0.35
            pf = 1.0 + (perf - 1.0) * pw
            ac = pl * pf * drv[t] * guv_shock(a, y, m)
            if a["midyear"] and t < MID_START:
                pl, ac = None, None
            PL[t] = pl
            AC[t] = ac

        PY = [None] * n
        for t in range(n):
            PY[t] = AC[t - 12] if t >= 12 else None

        # FC: Ist bis 2026-08, danach Plan x rollierende Ist/Plan-Quote
        num = sum(AC[t] for t in range(IDX_2026_01, IDX_2026_08 + 1) if AC[t] is not None)
        den = sum(PL[t] for t in range(IDX_2026_01, IDX_2026_08 + 1) if PL[t] is not None)
        bias = (num / den) if den else 1.0
        FC = [None] * n
        for t in range(n):
            if t <= IDX_2026_08:
                FC[t] = AC[t]
            else:
                FC[t] = (PL[t] * bias) if PL[t] is not None else None
        for t in range(IDX_2026_08 + 1, TL_N):
            AC[t] = None                    # YTG-Luecke (Story 10)
        a["PL"], a["AC"], a["PY"], a["FC"] = PL, AC, PY, FC


build_guv()

# FY-Skalare je Jahr ---------------------------------------------------------
GUV_YEARS = [2024, 2025, 2026]
YIDX = {y: [t for t, r in enumerate(TL) if r[0] == y] for y in GUV_YEARS}
for aid, a in ACC.items():
    a["FC_FY"] = {}
    a["PL_FY"] = {}
    for y in GUV_YEARS:
        a["FC_FY"][y] = sum(a["FC"][t] or 0.0 for t in YIDX[y])
        a["PL_FY"][y] = sum(a["PL"][t] or 0.0 for t in YIDX[y])


# ---------------------------------------------------------------------------
# 3) fact-guv.csv schreiben (Reihenfolge = Dim-Reihenfolge x Monat aufsteigend)
# ---------------------------------------------------------------------------
def icell(v):
    return "" if v is None else str(int(round(v)))


guv_path = os.path.join(OUT, "fact-guv.csv")
n_guv = 0
with open(guv_path, "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["AccountID", "Monat", "Datum", "AC", "PY", "PL", "FC", "FC_FY", "PL_FY"])
    for row in DIM_ROWS:
        aid = row["AccountID"]
        a = ACC[aid]
        for t in range(GUV_FIRST, TL_N):
            y, m, mo, dt = TL[t]
            if a["zero"]:
                w.writerow([aid, mo, dt, 0, 0, 0, 0, 0, 0])
            else:
                w.writerow([aid, mo, dt, icell(a["AC"][t]), icell(a["PY"][t]), icell(a["PL"][t]),
                            icell(a["FC"][t]), icell(a["FC_FY"][y]), icell(a["PL_FY"][y])])
            n_guv += 1


# ---------------------------------------------------------------------------
# 4) Sales-Stern
# ---------------------------------------------------------------------------
# (Product, Category, Produktlinie, units, ASP, COGS-Quote, Zielmarge, Lifecycle,
#  Einfuehrung, Farbe, Wachstum p.a.)
PRODUCTS = [
    ("Smartphone X",       "Electronics",     "Consumer Mobile",   200, 820.0, 0.600, 24.0, "Reife",    "2019-03-01", "#4E79A7", 0.030),
    ("Laptop Pro",         "Electronics",     "Computing",         120, 1450.0, 0.620, 22.0, "Reife",   "2018-09-01", "#59A14F", 0.025),
    ("Wireless Earbuds",   "Electronics",     "Audio",             340, 145.0, 0.550, 28.0, "Wachstum", "2021-05-01", "#76B7B2", 0.090),
    ("Smart Watch",        "Electronics",     "Wearables",         210, 310.0, 0.570, 26.0, "Wachstum", "2020-11-01", "#8CD17D", 0.075),
    ("Coffee Machine",     "Home Appliances", "Kitchen",           160, 380.0, 0.630, 20.0, "Auslauf",  "2016-02-01", "#B07AA1", -0.200),
    ("Robot Vacuum",       "Home Appliances", "Cleaning",          130, 520.0, 0.600, 23.0, "Reife",    "2019-08-01", "#F28E2B", 0.035),
    ("Air Purifier",       "Home Appliances", "Air Care",          110, 290.0, 0.580, 25.0, "Wachstum", "2022-01-01", "#FFBE7D", 0.100),
    ("Sensor Gateway",     "Industrial IoT",  "Industrial Sensing", 90, 940.0, 0.520, 30.0, "Reife",    "2020-04-01", "#4E6E9E", 0.045),
    ("Neuro Hub",          "Industrial IoT",  "Industrial Edge",    70, 1650.0, 0.480, 34.0, "Launch",  "2025-07-01", "#E15759", 0.000),
    ("Edge Controller",    "Industrial IoT",  "Industrial Edge",   100, 760.0, 0.540, 29.0, "Wachstum", "2021-10-01", "#FF9D9A", 0.085),
    ("Cloud Subscription", "Services",        "Cloud",             400, 95.0, 0.300, 45.0, "Wachstum",  "2021-01-01", "#79706E", 0.130),
    ("Support Plan",       "Services",        "Service",           260, 180.0, 0.350, 42.0, "Reife",    "2017-06-01", "#BAB0AC", 0.040),
]

# (Country, Region, ISO2, Waehrung, KlimaOrt, Marktreife, Gewicht)
MARKETS = [
    ("Germany",        "EMEA",     "DE", "EUR", "Berlin",        "Kernmarkt",      1.35),
    ("France",         "EMEA",     "FR", "EUR", "Paris",         "Kernmarkt",      0.90),
    ("United Kingdom", "EMEA",     "GB", "GBP", "London",        "Kernmarkt",      0.95),
    ("Italy",          "EMEA",     "IT", "EUR", "Mailand",       "Wachstumsmarkt", 0.60),
    ("Spain",          "EMEA",     "ES", "EUR", "Madrid",        "Wachstumsmarkt", 0.55),
    ("Netherlands",    "EMEA",     "NL", "EUR", "Amsterdam",     "Wachstumsmarkt", 0.50),
    ("Poland",         "EMEA",     "PL", "PLN", "Warschau",      "Aufbaumarkt",    0.35),
    ("USA",            "Americas", "US", "USD", "New York",      "Kernmarkt",      1.60),
    ("Canada",         "Americas", "CA", "CAD", "Toronto",       "Wachstumsmarkt", 0.60),
    ("Brazil",         "Americas", "BR", "BRL", "São Paulo",     "Aufbaumarkt",    0.50),
    ("Mexico",         "Americas", "MX", "MXN", "Mexiko-Stadt",  "Aufbaumarkt",    0.40),
    ("Argentina",      "Americas", "AR", "ARS", "Buenos Aires",  "Aufbaumarkt",    0.25),
    ("China",          "APAC",     "CN", "CNY", "Schanghai",     "Wachstumsmarkt", 1.25),
    ("Japan",          "APAC",     "JP", "JPY", "Tokio",         "Kernmarkt",      0.85),
    ("India",          "APAC",     "IN", "INR", "Mumbai",        "Wachstumsmarkt", 0.70),
    ("Australia",      "APAC",     "AU", "AUD", "Sydney",        "Wachstumsmarkt", 0.45),
    ("South Korea",    "APAC",     "KR", "KRW", "Seoul",         "Wachstumsmarkt", 0.50),
    ("Singapore",      "APAC",     "SG", "SGD", "Singapur",      "Aufbaumarkt",    0.30),
]

SCENARIOS = [
    ("AC",  "Ist",                  "Ist",   "AC", "Ist",      1),
    ("PL1", "Budget (verabschiedet)", "Plan1", "PL", "Plan",     2),
    ("PL2", "Ambitionsplan",        "Plan2", "PL", "Plan",     3),
    ("FC1", "Forecast Q4 Vorjahr",  "FC1",   "FC", "Forecast", 4),
    ("FC2", "Forecast Q1",          "FC2",   "FC", "Forecast", 5),
    ("FC3", "Forecast August",      "FC3",   "FC", "Forecast", 6),
]
FC_VINTAGE = {"FC1": 35, "FC2": 38, "FC3": IDX_2026_08}   # 2025-12 / 2026-03 / 2026-08

KPIS = [
    ("Revenue",               "Ergebnis",   "EUR",    "0.00", "true",  1),
    ("Cost",                  "Ergebnis",   "EUR",    "0.00", "false", 2),
    ("COGS",                  "Kosten",     "EUR",    "0.00", "false", 3),
    ("Profit",                "Ergebnis",   "EUR",    "0.00", "true",  4),
    ("Units Sold",            "Menge",      "Stueck", "0",    "true",  5),
    ("Discount",              "Kosten",     "EUR",    "0.00", "false", 6),
    ("Marketing Spend",       "Kosten",     "EUR",    "0.00", "false", 7),
    ("Orders",                "Menge",      "Anzahl", "0",    "true",  8),
    ("Returned Units",        "Qualitaet",  "Stueck", "0",    "false", 9),
    ("New Customers",         "Kunde",      "Anzahl", "0",    "true",  10),
    ("Customer Satisfaction", "Qualitaet",  "Punkte", "0.0",  "true",  11),
]

CAT_SEASON = {
    "Electronics":     [0.92, 0.86, 0.98, 0.95, 0.99, 1.02, 0.96, 0.93, 1.05, 1.08, 1.20, 1.30],
    "Home Appliances": [0.95, 0.90, 1.02, 1.05, 1.08, 1.02, 0.94, 0.92, 1.00, 1.05, 1.15, 1.22],
    "Industrial IoT":  [0.88, 0.92, 1.10, 0.98, 1.02, 1.14, 0.90, 0.82, 1.06, 1.08, 1.06, 1.18],
    "Services":        [1.00, 0.99, 1.01, 1.00, 1.00, 1.02, 0.99, 0.98, 1.01, 1.01, 1.02, 1.03],
}

LAUNCH_IDX = {}
for p in PRODUCTS:
    ey, em = int(p[8][:4]), int(p[8][5:7])
    LAUNCH_IDX[p[0]] = max(0, (ey - TL_Y0) * 12 + (em - 1))

MKT = {m[0]: m for m in MARKETS}
PRD = {p[0]: p for p in PRODUCTS}

ALPHA_SALES = {"units": 0.075, "price": 0.030, "cogs": 0.055, "mkt": 0.060}

# --- Story-Parameter --------------------------------------------------------
NEURO_RAMP = [0.06, 0.14, 0.26, 0.42, 0.58, 0.72, 0.83, 0.90, 0.95, 0.98,
              1.00, 1.04, 1.08, 1.12, 1.16, 1.20, 1.24, 1.28]   # ab 2025-07

SALES_SHOCK = {   # COGS-Aufschlag (Story 2)
    (2024, 7): 1.055, (2024, 8): 1.105, (2024, 9): 1.155,
    (2024, 10): 1.210, (2024, 11): 1.200, (2024, 12): 1.170,
    (2025, 1): 1.120, (2025, 2): 1.090, (2025, 3): 1.060,
    (2025, 4): 1.032, (2025, 5): 1.014, (2025, 6): 1.000,
}

QUAL_RET = {(2025, 11): 3.4, (2025, 12): 3.1,
            (2026, 1): 2.2, (2026, 2): 1.8, (2026, 3): 1.5,
            (2026, 4): 1.25, (2026, 5): 1.08}
QUAL_CSAT = {(2025, 11): -13.4, (2025, 12): -12.0,
             (2026, 1): -8.5, (2026, 2): -6.0, (2026, 3): -4.0,
             (2026, 4): -2.2, (2026, 5): -0.8}

MKT_PUSH = {(2026, 1): 1.45, (2026, 2): 1.52, (2026, 3): 1.57, (2026, 4): 1.55,
            (2026, 5): 1.50, (2026, 6): 1.48}
MKT_PUSH_ECHO = {(2026, 3): 1.035, (2026, 4): 1.070, (2026, 5): 1.105,
                 (2026, 6): 1.130, (2026, 7): 1.120, (2026, 8): 1.095}


def brazil_factors(y, m):
    """(revenue_mult, cogs_mult, discount_mult, kostenquote_ziel) fuer Story 4.

    In den roten Jahren wird die Gesamtkostenquote hart auf > 100 % gezogen
    (Preiskampf + Zoelle + Abwertung) -> Profit sicher negativ."""
    if y == 2023:
        return 0.86, 1.20, 2.2, 1.13
    if y == 2024:
        return 0.88, 1.16, 2.0, 1.07
    if y == 2025 and m <= 6:
        return 0.96, 1.06, 1.35, 1.00
    if y == 2025:
        return 1.10, 0.97, 0.95, None
    return 1.18, 0.94, 0.85, None


_sales_cache = {}


def sales_driver(prod, ctry):
    key = (prod, ctry)
    if key in _sales_cache:
        return _sales_cache[key]
    p = PRD[prod]
    mk = MKT[ctry]
    zc, _ = zsig("CAT|" + p[1] + "|" + mk[1])
    zr, _ = zsig("MKT|" + ctry)
    zi, _ = zsig("PC|" + prod + "|" + ctry)
    mix = [(1.00 * zc[t] + 0.45 * zr[t] + 0.40 * zi[t]) / math.sqrt(1.0 + 0.45 ** 2 + 0.40 ** 2)
           for t in range(TL_N)]
    res = (mix, zc)
    _sales_cache[key] = res
    return res


def base_units(prod, ctry, t):
    """Glatte Mengenbasis ohne Treiber/Storys (Plan-Sicht)."""
    p = PRD[prod]
    mk = MKT[ctry]
    y, m = TL[t][0], TL[t][1]
    li = LAUNCH_IDX[prod]
    if t < li:
        return 0.0
    g = (1.0 + p[10]) ** ((t - 24) / 12.0)          # Referenzpunkt Mitte 2025
    u = p[3] * mk[6] * CAT_SEASON[p[1]][m - 1] * g
    if prod == "Neuro Hub":
        k = t - li
        u = p[3] * mk[6] * CAT_SEASON[p[1]][m - 1] * (NEURO_RAMP[k] if k < len(NEURO_RAMP)
                                                      else NEURO_RAMP[-1] * (1.02 ** (k - len(NEURO_RAMP) + 1)))
    return u


def asp(prod, t):
    p = PRD[prod]
    drift = -0.020 if p[7] == "Auslauf" else (-0.006 if p[1] == "Electronics" else 0.008)
    return p[4] * ((1.0 + drift) ** (t / 12.0))


def disc_rate(prod, ctry, t, actual):
    p = PRD[prod]
    y, m = TL[t][0], TL[t][1]
    r = 0.062
    if p[7] == "Auslauf":
        r = 0.055 + 0.115 * (t / (TL_N - 1.0))       # Story 3: Rabatt steigt stark
    elif p[7] == "Launch":
        r = 0.030
    elif p[7] == "Wachstum":
        r = 0.050
    if actual and ctry == "Brazil":
        r *= brazil_factors(y, m)[2]
    return clamp(r, 0.01, 0.32)


def cogs_rate(prod, ctry, t, actual):
    p = PRD[prod]
    y, m = TL[t][0], TL[t][1]
    r = p[5] * (1.0 - 0.012 * (t / 12.0))            # Skaleneffekt
    if actual:
        r *= SALES_SHOCK.get((y, m), 1.0)
        if ctry == "Brazil":
            r *= brazil_factors(y, m)[1]
    return clamp(r, 0.20, 0.95)


def mkt_rate(prod, ctry, t, actual):
    mk = MKT[ctry]
    y, m = TL[t][0], TL[t][1]
    r = 0.066
    if PRD[prod][7] in ("Launch", "Wachstum"):
        r = 0.092
    if actual and mk[1] == "EMEA":
        r *= MKT_PUSH.get((y, m), 1.0)
    if actual and ctry == "Brazil" and y <= 2024:
        r *= 1.30
    return r


def compute(prod, ctry, t, scen):
    """Liefert dict mit den 11 KPI-Werten fuer eine Zelle."""
    p = PRD[prod]
    mk = MKT[ctry]
    y, m = TL[t][0], TL[t][1]
    li = LAUNCH_IDX[prod]

    if t < li:
        d = {k: 0.0 for k, *_ in KPIS}
        d["Customer Satisfaction"] = None
        return d

    actual = scen == "AC" or (scen in FC_VINTAGE and t <= FC_VINTAGE[scen])
    mix, _ = sales_driver(prod, ctry)

    u = base_units(prod, ctry, t)
    if actual:
        u *= math.exp(ALPHA_SALES["units"] * mix[t])
        if mk[1] == "EMEA":
            u *= MKT_PUSH_ECHO.get((y, m), 1.0)
        if ctry == "Brazil":
            u *= brazil_factors(y, m)[0]
        if scen != "AC":
            # Forecast-Vintages weichen leicht vom Ist ab
            u *= 1.0 + (h64("fcv", scen, prod, ctry, t) % 100 - 50) / 5000.0
    else:
        if scen == "PL2":
            u *= 1.065
        elif scen.startswith("FC"):
            # Rest-Plan mit vintage-spezifischem Bias
            bias = {"FC1": 1.015, "FC2": 0.985, "FC3": 1.035}[scen]
            u *= bias
        else:
            u *= 1.020                                # PL1: leicht optimistischer Plan

    price = asp(prod, t) * math.exp(ALPHA_SALES["price"] * mix[t] * (1.0 if actual else 0.0))
    revenue = u * price

    dr = disc_rate(prod, ctry, t, actual)
    cr = cogs_rate(prod, ctry, t, actual)
    mr = mkt_rate(prod, ctry, t, actual)
    if actual:
        cr *= math.exp(ALPHA_SALES["cogs"] * mix[t] * 0.45)
        mr *= math.exp(ALPHA_SALES["mkt"] * mix[t] * 0.30)

    discount = revenue * dr
    cogs = revenue * cr
    marketing = revenue * mr
    if actual and ctry == "Brazil":
        tgt = brazil_factors(y, m)[3]
        if tgt is not None:
            tot = cogs + discount + marketing
            if tot > 0:
                k = revenue * tgt / tot
                cogs *= k
                discount *= k
                marketing *= k

    orders = u / (1.15 + (h64("ord", prod, ctry) % 40) / 100.0)
    ret_rate = 0.021 + (h64("ret", prod) % 12) / 1000.0
    if actual:
        ret_rate *= QUAL_RET.get((y, m), 1.0)
    returned = u * ret_rate
    newcust = u / (4.6 + (h64("nc", ctry) % 30) / 10.0) * (1.0 + 0.15 * (p[7] in ("Launch", "Wachstum")))

    csat_base = 78.0 + (h64("csat", prod) % 90) / 10.0
    csat = csat_base + (2.0 if mk[5] == "Kernmarkt" else 0.0) + 1.5 * mix[t]
    if actual:
        csat += QUAL_CSAT.get((y, m), 0.0)
    if not actual:
        csat = csat_base + 2.0
    if ctry == "Brazil" and y <= 2024 and actual:
        csat -= 4.0

    return {
        "Revenue": revenue, "COGS": cogs, "Discount": discount,
        "Marketing Spend": marketing, "Units Sold": u, "Orders": orders,
        "Returned Units": returned, "New Customers": newcust,
        "Customer Satisfaction": clamp(csat, 0.0, 100.0),
    }


SALES_COLS = ["Date", "Scenario", "Product", "Category", "Country", "Region",
              "Revenue", "Cost", "COGS", "Profit", "Units Sold", "Discount",
              "Marketing Spend", "Orders", "Returned Units", "New Customers",
              "Customer Satisfaction"]

sales_path = os.path.join(OUT, "sales-fact.csv")
n_sales = 0
SALES_AGG = []          # Nachrechnen fuer die Selbstpruefung

with open(sales_path, "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(SALES_COLS)
    for scen, *_rest in SCENARIOS:
        tmax = IDX_2026_08 if scen == "AC" else TL_N - 1
        for p in PRODUCTS:
            prod, cat = p[0], p[1]
            for mk in MARKETS:
                ctry, reg = mk[0], mk[1]
                for t in range(0, tmax + 1):
                    d = compute(prod, ctry, t, scen)
                    rev = round(d["Revenue"], 2)
                    cogs = round(d["COGS"], 2)
                    disc = round(d["Discount"], 2)
                    mspd = round(d["Marketing Spend"], 2)
                    cost = round(cogs + disc + mspd, 2)
                    profit = round(rev - cost, 2)
                    units = int(round(d["Units Sold"]))
                    orders = int(round(d["Orders"]))
                    retu = int(round(d["Returned Units"]))
                    newc = int(round(d["New Customers"]))
                    cs = d["Customer Satisfaction"]
                    cs_s = "" if cs is None else ("%.1f" % cs)
                    w.writerow([TL[t][3], scen, prod, cat, ctry, reg,
                                "%.2f" % rev, "%.2f" % cost, "%.2f" % cogs, "%.2f" % profit,
                                units, "%.2f" % disc, "%.2f" % mspd,
                                orders, retu, newc, cs_s])
                    n_sales += 1
                    SALES_AGG.append((scen, t, prod, cat, ctry, reg, rev, cost, cogs,
                                      profit, units, disc, mspd, orders, retu, newc,
                                      None if cs is None else float(cs_s)))

# ---------------------------------------------------------------------------
# 5) Sales-Dimensionen
# ---------------------------------------------------------------------------
PLACE_BY_NAME = {p["OrtName"]: p for p in PLACES}

with open(os.path.join(OUT, "dim-produkt.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["Product", "ProduktID", "Category", "Produktlinie", "Einfuehrung",
                "Zielmarge_pct", "Lebenszyklus", "Farbe"])
    for i, p in enumerate(PRODUCTS):
        w.writerow([p[0], "P%02d" % (i + 1), p[1], p[2], p[8], "%.1f" % p[6], p[7], p[9]])

with open(os.path.join(OUT, "dim-markt.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["Country", "Region", "ISO2", "Waehrung", "Breitengrad", "Laengengrad",
                "KlimaOrt", "Marktreife"])
    for m in MARKETS:
        pl = PLACE_BY_NAME[m[4]]
        w.writerow([m[0], m[1], m[2], m[3], pl["Breitengrad"], pl["Laengengrad"], m[4], m[5]])

with open(os.path.join(OUT, "dim-szenario.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["Scenario", "Szenario_Name", "Szenario_Kurz", "IBCS", "Typ", "Sortierung"])
    for s in SCENARIOS:
        w.writerow(list(s))

with open(os.path.join(OUT, "dim-kpi.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["KPI", "KPI_Gruppe", "Einheit", "Format", "HoeherIstBesser", "Sortierung"])
    for k in KPIS:
        w.writerow(list(k))

# ---------------------------------------------------------------------------
# 6) Klima-Stern
# ---------------------------------------------------------------------------
def klimazone(lat):
    a = abs(lat)
    if a < 23.5:
        return "Tropisch"
    if a < 35.0:
        return "Subtropisch"
    if a < 55.0:
        return "Gemäßigt"
    if a < 66.5:
        return "Subpolar"
    return "Polar"


with open(os.path.join(OUT, "dim-ort.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["OrtID", "Ort", "Land", "Region", "Breitengrad", "Laengengrad",
                "MittelC_1961_1990", "Klimazone"])
    for p in PLACES:
        w.writerow([p["OrtID"], p["OrtName"], p["Land"], p["Region"],
                    p["Breitengrad"], p["Laengengrad"], p["MittelC"],
                    klimazone(float(p["Breitengrad"]))])

n_klima = 0
with open(os.path.join(OUT, "fact-klima.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["OrtID", "Jahr", "AnomalieC", "TemperaturC", "Anomalie_gleitend_10J"])
    for p in PLACES:
        mid = float(p["MittelC"])
        an = p["anom"]
        n = len(an)
        for i, jahr in enumerate(p["jahre"]):
            lo, hi = max(0, i - 4), min(n, i + 6)
            gl = statistics.fmean(an[lo:hi])
            w.writerow([p["OrtID"], jahr, "%.2f" % an[i], "%.2f" % (mid + an[i]), "%.3f" % gl])
            n_klima += 1


def periode(j):
    if j <= 1879:
        return "Vorindustriell"
    if j <= 1944:
        return "Industrialisierung"
    if j <= 1979:
        return "Nachkriegszeit"
    if j <= 1999:
        return "Moderne"
    return "Klimawandel"


JAHRE = PLACES[0]["jahre"]
with open(os.path.join(OUT, "dim-jahr.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["Jahr", "Dekade", "Jahrhundert", "Periode"])
    for j in JAHRE:
        w.writerow([j, "%der" % (j // 10 * 10), "%d. Jh." % ((j - 1) // 100 + 1), periode(j)])

# ---------------------------------------------------------------------------
# 7) Uebernahmen: gantt.csv / guv-wasserfall.csv
# ---------------------------------------------------------------------------
def de2iso(s):
    s = s.strip()
    if len(s) == 10 and s[2] == "." and s[5] == ".":
        return "%s-%s-%s" % (s[6:10], s[3:5], s[0:2])
    return s


with open(SRC_GANTT, "r", encoding="utf-8-sig", newline="") as f:
    grows = list(csv.reader(f, delimiter=";"))
n_gantt = 0
with open(os.path.join(OUT, "gantt.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    head = grows[0]
    w.writerow(head)
    i_start, i_ende = head.index("start"), head.index("ende")
    for r in grows[1:]:
        if not any(x.strip() for x in r):
            continue
        r = list(r)
        r[i_start] = de2iso(r[i_start])
        r[i_ende] = de2iso(r[i_ende])
        w.writerow(r)
        n_gantt += 1

with open(SRC_WASSERFALL, "r", encoding="utf-8-sig", newline="") as f:
    wrows = list(csv.reader(f, delimiter=";"))
n_wf = 0
with open(os.path.join(OUT, "guv-wasserfall.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    head = wrows[0]
    w.writerow(head)
    numcols = [head.index(c) for c in ("AC", "PY", "PL")]
    for r in wrows[1:]:
        if not any(x.strip() for x in r):
            continue
        r = list(r)
        for c in numcols:
            r[c] = r[c].replace(",", ".")
        w.writerow(r)
        n_wf += 1

# ===========================================================================
# 8) SELBSTPRUEFUNG
# ===========================================================================
CHECKS = []


def chk(nr, name, ok, detail):
    CHECKS.append((nr, name, bool(ok), detail))
    return bool(ok)


# --- Hilfsaggregate Sales ---------------------------------------------------
def s_sum(field, pred):
    idx = {"Revenue": 6, "Cost": 7, "COGS": 8, "Profit": 9, "Units Sold": 10,
           "Discount": 11, "Marketing Spend": 12, "Orders": 13,
           "Returned Units": 14, "New Customers": 15}[field]
    return sum(r[idx] for r in SALES_AGG if pred(r))


def yq(t):
    y, m = TL[t][0], TL[t][1]
    return y, (m - 1) // 3 + 1


# Story 1 — Produkt-Launch Neuro Hub
nh_pre = s_sum("Revenue", lambda r: r[0] == "AC" and r[2] == "Neuro Hub" and TL[r[1]][0] == 2025 and TL[r[1]][1] == 6)
nh_h2_25 = s_sum("Revenue", lambda r: r[0] == "AC" and r[2] == "Neuro Hub" and TL[r[1]][0] == 2025)
nh_26 = s_sum("Revenue", lambda r: r[0] == "AC" and r[2] == "Neuro Hub" and TL[r[1]][0] == 2026)
chk(1, "Produkt-Launch Neuro Hub ab 2025-07",
    nh_pre == 0.0 and nh_h2_25 > 0 and nh_26 > 3.0 * nh_h2_25,
    "Rev 2025-06 = %.0f (=0), 2025 (H2) = %.2f mEUR, 2026 (Jan-Aug) = %.2f mEUR, Faktor %.2fx"
    % (nh_pre, nh_h2_25 / MEUR, nh_26 / MEUR, (nh_26 / nh_h2_25) if nh_h2_25 else 0))

# Story 2 — Lieferketten-Schock: COGS-Quote 2024-Q4 vs 2024-Q2
def cogs_quote(pred):
    r = s_sum("Revenue", pred)
    c = s_sum("COGS", pred)
    return (c / r) if r else 0.0


q2_24 = cogs_quote(lambda r: r[0] == "AC" and yq(r[1]) == (2024, 2))
q4_24 = cogs_quote(lambda r: r[0] == "AC" and yq(r[1]) == (2024, 4))
q2_25 = cogs_quote(lambda r: r[0] == "AC" and yq(r[1]) == (2025, 2))
delta = q4_24 / q2_24 - 1.0
chk(2, "Lieferketten-Schock 2024-Q3/Q4 (COGS-Quote)",
    delta > 0.15 and q2_25 < q4_24,
    "COGS-Quote 2024-Q2 %.2f%% -> 2024-Q4 %.2f%% (%+.1f%% rel.), Erholung 2025-Q2 %.2f%%"
    % (q2_24 * 100, q4_24 * 100, delta * 100, q2_25 * 100))

# Story 3 — Auslaufprodukt Coffee Machine
cm_23 = s_sum("Units Sold", lambda r: r[0] == "AC" and r[2] == "Coffee Machine" and TL[r[1]][0] == 2023)
cm_26 = s_sum("Units Sold", lambda r: r[0] == "AC" and r[2] == "Coffee Machine" and TL[r[1]][0] == 2026)
cm_23a = s_sum("Units Sold", lambda r: r[0] == "AC" and r[2] == "Coffee Machine" and TL[r[1]][0] == 2023 and TL[r[1]][1] <= 8)
cm_dr23 = (s_sum("Discount", lambda r: r[0] == "AC" and r[2] == "Coffee Machine" and TL[r[1]][0] == 2023)
           / max(1.0, s_sum("Revenue", lambda r: r[0] == "AC" and r[2] == "Coffee Machine" and TL[r[1]][0] == 2023)))
cm_dr26 = (s_sum("Discount", lambda r: r[0] == "AC" and r[2] == "Coffee Machine" and TL[r[1]][0] == 2026)
           / max(1.0, s_sum("Revenue", lambda r: r[0] == "AC" and r[2] == "Coffee Machine" and TL[r[1]][0] == 2026)))
vol_drop = cm_26 / cm_23a - 1.0
chk(3, "Auslaufprodukt Coffee Machine",
    vol_drop <= -0.40 and cm_dr26 > cm_dr23 * 1.8,
    "Menge Jan-Aug: 2023 %d -> 2026 %d (%+.1f%%), Rabattquote %.1f%% -> %.1f%%"
    % (cm_23a, cm_26, vol_drop * 100, cm_dr23 * 100, cm_dr26 * 100))

# Story 4 — Turnaround Brasilien
br_23 = s_sum("Profit", lambda r: r[0] == "AC" and r[4] == "Brazil" and TL[r[1]][0] == 2023)
br_24 = s_sum("Profit", lambda r: r[0] == "AC" and r[4] == "Brazil" and TL[r[1]][0] == 2024)
br_ac_late = s_sum("Revenue", lambda r: r[0] == "AC" and r[4] == "Brazil"
                   and (TL[r[1]][0] == 2026 or (TL[r[1]][0] == 2025 and TL[r[1]][1] >= 7)))
br_pl_late = s_sum("Revenue", lambda r: r[0] == "PL1" and r[4] == "Brazil"
                   and ((TL[r[1]][0] == 2026 and TL[r[1]][1] <= 8) or (TL[r[1]][0] == 2025 and TL[r[1]][1] >= 7)))
chk(4, "Turnaround Brasilien",
    br_23 < 0 and br_24 < 0 and br_ac_late > br_pl_late,
    "Profit 2023 %.2f mEUR, 2024 %.2f mEUR; Rev ab 2025-Q3 AC %.2f vs PL1 %.2f mEUR (%+.1f%%)"
    % (br_23 / MEUR, br_24 / MEUR, br_ac_late / MEUR, br_pl_late / MEUR,
       (br_ac_late / br_pl_late - 1) * 100 if br_pl_late else 0))

# Story 5 — Mid-Year-Konsolidierung
mid_ids = [aid for aid, a in ACC.items() if a["midyear"]]
mid_ok = True
mid_detail = ""
if mid_ids:
    a = ACC[mid_ids[0]]
    pre = all(a["AC"][t] is None and a["PL"][t] is None for t in range(GUV_FIRST, MID_START))
    post = a["AC"][MID_START] is not None
    py_gap = all(a["PY"][t] is None for t in range(GUV_FIRST, MID_START + 12))
    mid_ok = pre and post and py_gap
    mid_detail = ("%d Konten (Entity 3140): AC/PL leer 2024-01..2025-03, ab 2025-04 belegt, "
                  "PY leer bis 2026-03" % len(mid_ids))
chk(5, "Mid-Year-Konsolidierung (M&A-Luecke)", mid_ok, mid_detail)

# Story 6 — Marketing-Push EMEA 2026-H1
def emea(scn, y, m0, m1, field):
    return s_sum(field, lambda r: r[0] == scn and r[5] == "EMEA" and TL[r[1]][0] == y
                 and m0 <= TL[r[1]][1] <= m1)


mk26 = emea("AC", 2026, 1, 6, "Marketing Spend")
mk25 = emea("AC", 2025, 1, 6, "Marketing Spend")
rv26 = emea("AC", 2026, 1, 6, "Revenue")
rv25 = emea("AC", 2025, 1, 6, "Revenue")
quote_up = (mk26 / rv26) / (mk25 / rv25) - 1.0


def ac_pl(y, m0, m1):
    a = emea("AC", y, m0, m1, "Revenue")
    p = emea("PL1", y, m0, m1, "Revenue")
    return a / p if p else 0.0


echo_pre = ac_pl(2026, 1, 2)
echo_post = ac_pl(2026, 3, 8)
chk(6, "Marketing-Push EMEA 2026-H1",
    0.52 <= quote_up <= 0.70 and mk26 / mk25 >= 1.55 and echo_post > echo_pre * 1.02,
    "Marketing-Quote EMEA H1: %.2f%% -> %.2f%% (%+.0f%% = der Push); absolut %.2f -> %.2f mEUR "
    "(%+.0f%%, zusaetzlich getrieben vom Neuro-Hub-Ramp); Revenue-Echo AC/PL1 %.3f (Jan/Feb) -> "
    "%.3f (Mrz-Aug, 2 Monate Verzug)"
    % (mk25 / rv25 * 100, mk26 / rv26 * 100, quote_up * 100, mk25 / MEUR, mk26 / MEUR,
       (mk26 / mk25 - 1) * 100, echo_pre, echo_post))

# Story 7 — Qualitaetsvorfall 2025-11/12
def ret_rate(y, m):
    u = s_sum("Units Sold", lambda r: r[0] == "AC" and TL[r[1]][0] == y and TL[r[1]][1] == m)
    q = s_sum("Returned Units", lambda r: r[0] == "AC" and TL[r[1]][0] == y and TL[r[1]][1] == m)
    return q / u if u else 0.0


def csat(y, m):
    vs = [r[16] for r in SALES_AGG if r[0] == "AC" and TL[r[1]][0] == y and TL[r[1]][1] == m
          and r[16] is not None and r[6] > 0]
    return statistics.fmean(vs) if vs else 0.0


base_ret = statistics.fmean([ret_rate(2025, m) for m in (7, 8, 9, 10)])
inc_ret = ret_rate(2025, 11)
base_cs = statistics.fmean([csat(2025, m) for m in (7, 8, 9, 10)])
inc_cs = csat(2025, 11)
rec_cs = csat(2026, 4)
chk(7, "Qualitaetsvorfall 2025-11/12",
    inc_ret > 3.0 * base_ret and (base_cs - inc_cs) >= 12.0 and (base_cs - rec_cs) < 3.0,
    "Retourenquote %.2f%% -> %.2f%% (%.1fx); CSAT %.1f -> %.1f (%.1f Pkt.), 2026-04 wieder %.1f"
    % (base_ret * 100, inc_ret * 100, inc_ret / base_ret if base_ret else 0,
       base_cs, inc_cs, inc_cs - base_cs, rec_cs))

# Story 8 — Mobility Solutions unter Plan (GuV)
def seg_ratio(segname, t0, t1):
    ac = pl = 0.0
    for aid, a in ACC.items():
        if a["zero"] or a["l1"] != "Net revenue" or a["l2"] != segname:
            continue
        s = a["sign"]
        ac += s * sum(a["AC"][t] or 0.0 for t in range(t0, t1 + 1))
        pl += s * sum(a["PL"][t] or 0.0 for t in range(t0, t1 + 1))
    return ac, pl, (ac / pl if pl else 0.0)


ms = seg_ratio("Mobility Solutions", IDX_2026_01, IDX_2026_06)
es = seg_ratio("Energy Systems", IDX_2026_01, IDX_2026_06)
ds = seg_ratio("Digital Services", IDX_2026_01, IDX_2026_06)
chk(8, "Mobility Solutions unter Plan, ES+DS kompensieren",
    0.88 <= ms[2] <= 0.97 and es[2] > 1.03 and ds[2] > 1.05,
    "AC/PL 2026-H1: Mobility %.1f%% (%+.1f%%), Energy %.1f%% (%+.1f%%), Digital %.1f%% (%+.1f%%)"
    % (ms[2] * 100, (ms[2] - 1) * 100, es[2] * 100, (es[2] - 1) * 100, ds[2] * 100, (ds[2] - 1) * 100))

# Story 9 — Energiepreis-Kopplung: Segment-COGS folgt der Klima-Treiberserie
cors = []
for segname, segkey in [("Industrial Automation", "IA"), ("Energy Systems", "ES"),
                        ("Mobility Solutions", "MS"), ("Digital Services", "DS")]:
    accs = [a for a in ACC.values() if not a["zero"] and a["grp"] == "COGS" and a["seg"] == segname]
    if not accs:
        continue
    zs, _ = zsig("SEG|" + segname)
    dev, zz = [], []
    for t in range(IDX_2026_08 + 1):
        ac = sum(a["AC"][t] or 0.0 for a in accs)
        pl = sum(a["PL"][t] or 0.0 for a in accs)
        if ac > 0 and pl > 0:
            dev.append(math.log(ac / pl))
            zz.append(zs[t])
    cors.append((segname, pearson(dev, zz)))
min_cor = min(c for _, c in cors) if cors else 0.0
chk(9, "Energiepreis-Kopplung Segment-COGS <-> Klimareihe",
    min_cor >= 0.50,
    "Pearson r je Segment: " + ", ".join("%s %.2f" % (n, c) for n, c in cors))

# Story 10 — YTG-Luecke 2026
ac_after = 0
fc_after = 0.0
pl_after = 0.0
for aid, a in ACC.items():
    if a["zero"]:
        continue
    for t in range(IDX_2026_08 + 1, TL_N):
        fc_after += a["sign"] * (a["FC"][t] or 0.0)
        pl_after += a["sign"] * (a["PL"][t] or 0.0)
sales_ac_after = s_sum("Revenue", lambda r: r[0] == "AC" and r[1] > IDX_2026_08)
chk(10, "YTG-Luecke 2026 (AC endet 2026-08, FC fuellt, PL laeuft durch)",
    fc_after != 0 and pl_after != 0 and sales_ac_after == 0,
    "GuV 2026-09..12: AC leer, FC %.1f mEUR, PL %.1f mEUR; Sales: keine AC-Zeilen nach 2026-08"
    % (fc_after / MEUR, pl_after / MEUR))

# --- Integritaetspruefungen -------------------------------------------------
bad_profit = 0
bad_cost = 0
for r in SALES_AGG:
    rev, cost, cogs, profit, disc, mspd = r[6], r[7], r[8], r[9], r[11], r[12]
    if abs(round(rev - cost, 2) - profit) > 0.005:
        bad_profit += 1
    if abs(round(cogs + disc + mspd, 2) - cost) > 0.005:
        bad_cost += 1
chk(11, "Profit = Revenue - Cost (zeilenweise, 2 NK)", bad_profit == 0,
    "%d Abweichungen in %d Zeilen" % (bad_profit, len(SALES_AGG)))
chk(12, "Cost = COGS + Discount + Marketing Spend (zeilenweise, 2 NK)", bad_cost == 0,
    "%d Abweichungen in %d Zeilen" % (bad_cost, len(SALES_AGG)))

# Abnahmewerte GuV 2026-H1 ---------------------------------------------------
def l1_tot(l1, key, t0, t1):
    v = 0.0
    for aid, a in ACC.items():
        if a["zero"] or a["l1"] != l1:
            continue
        v += a["sign"] * sum(a[key][t] or 0.0 for t in range(t0, t1 + 1))
    return v


def block6(key):
    return {n: l1_tot(n, key, IDX_2026_01, IDX_2026_06) for n in
            ["Net revenue", "Cost of goods sold", "Operating expenses",
             "Other operating result", "Depreciation & amortization",
             "Financial result", "Income taxes"]}


B = {k: block6(k) for k in ("AC", "PY", "PL")}


def pnl_lines(b):
    rev = b["Net revenue"]
    cogs = b["Cost of goods sold"]
    gp = rev + cogs
    opex = b["Operating expenses"]
    oor = b["Other operating result"]
    ebitda = gp + opex + oor
    da = b["Depreciation & amortization"]
    ebit = ebitda + da
    fin = b["Financial result"]
    ebt = ebit + fin
    tax = b["Income taxes"]
    ni = ebt + tax
    return {"Net revenue": rev, "Cost of goods sold": cogs, "Gross profit": gp,
            "Operating expenses": opex, "Other operating result": oor, "EBITDA": ebitda,
            "Depreciation & amortization": da, "EBIT": ebit, "Financial result": fin,
            "EBT": ebt, "Income taxes": tax, "Net income": ni}


P = {k: pnl_lines(B[k]) for k in ("AC", "PY", "PL")}
TARGETS = {"Net revenue": 1664.6, "EBITDA": 277.4, "Net income": 135.0}
dev = {k: abs(P["AC"][k] / MEUR / v - 1.0) for k, v in TARGETS.items()}
chk(13, "Abnahmewerte 2026-H1 in Groessenordnung des Alt-Datensatzes",
    max(dev.values()) < 0.10,
    "Net revenue %.1f (Soll 1664.6, %+.1f%%), EBITDA %.1f (Soll 277.4, %+.1f%%), "
    "Net income %.1f (Soll 135.0, %+.1f%%)"
    % (P["AC"]["Net revenue"] / MEUR, (P["AC"]["Net revenue"] / MEUR / 1664.6 - 1) * 100,
       P["AC"]["EBITDA"] / MEUR, (P["AC"]["EBITDA"] / MEUR / 277.4 - 1) * 100,
       P["AC"]["Net income"] / MEUR, (P["AC"]["Net income"] / MEUR / 135.0 - 1) * 100))

# SortOrder-Konsistenz im 6-Monats-Fenster -----------------------------------
win = ["2026-%02d" % m for m in range(1, 7)]
pos = 0
so_bad = 0
with open(guv_path, "r", encoding="utf-8", newline="") as f:
    rd = csv.DictReader(f, delimiter=";")
    seen_order = []
    for r in rd:
        if r["Monat"] in win:
            seen_order.append((r["AccountID"], r["Monat"]))
so_map = {r["AccountID"]: int(r["SortOrder"]) for r in DIM_ROWS}
for i, (aid, mo) in enumerate(seen_order):
    if i % 6 == 0:
        if so_map[aid] != i:
            so_bad += 1
    if win[i % 6] != mo:
        so_bad += 1
chk(14, "SortOrder == DataView-Index im Fenster 2026-01..2026-06",
    so_bad == 0 and len(seen_order) == 30000,
    "%d Zeilen im Fenster, %d Abweichungen (SortOrder = 6 x Zeilenposition)" % (len(seen_order), so_bad))

# Formel-/KPI-/Separator-/Knotenzeilen haben Faktzeilen ----------------------
zero_types = [r["AccountID"] for r in DIM_ROWS if r["RowType"] in ("Formula", "KPI", "Separator", "Subtotal")]
chk(15, "Formel-/KPI-/Separator-/Knotenzeilen bleiben im DataView (0-Werte)",
    all(ACC[a]["zero"] for a in zero_types),
    "%d Zeilen (5 Formula, 3 KPI, 2 Separator, 374 Subtotal) x 36 Monate mit 0" % len(zero_types))

# Ruhende Konten / Orphans / Kommentare --------------------------------------
n_dormant = sum(1 for a in ACC.values() if a["dormant"] and a["rowtype"] == "Account")
n_orph = sum(1 for r in DIM_ROWS if r["ParentAccountID"] == "N-CONS-ELIM")
n_comm = sum(1 for r in DIM_ROWS if r["Kommentar"].strip())
chk(16, "Ruhende Konten / Orphans / Kommentar-Konten erhalten",
    n_dormant == 115 and n_orph == 3 and n_comm >= 3,
    "%d ruhende Konten (ueberall 0), %d Orphans, %d Kommentar-Konten" % (n_dormant, n_orph, n_comm))


# ===========================================================================
# 9) Datei-Report / FK-Pruefungen
# ===========================================================================
FILES = ["dim-konten.csv", "fact-guv.csv", "sales-fact.csv", "dim-produkt.csv",
         "dim-markt.csv", "dim-szenario.csv", "dim-kpi.csv", "dim-ort.csv",
         "fact-klima.csv", "dim-jahr.csv", "gantt.csv", "guv-wasserfall.csv"]

file_stats = []
for fn in FILES:
    p = os.path.join(OUT, fn)
    with open(p, "rb") as f:
        raw = f.read()
    bom = raw.startswith(b"\xef\xbb\xbf")
    with open(p, "r", encoding="utf-8", newline="") as f:
        rr = list(csv.reader(f, delimiter=";"))
    file_stats.append((fn, len(rr) - 1, len(rr[0]), len(raw), bom))

chk(17, "Kein BOM in irgendeiner Datei", not any(s[4] for s in file_stats),
    ", ".join("%s %s" % (s[0], "BOM!" if s[4] else "ok") for s in file_stats))


def load(fn):
    with open(os.path.join(OUT, fn), "r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


dk = load("dim-konten.csv")
fg_ids = set()
with open(os.path.join(OUT, "fact-guv.csv"), "r", encoding="utf-8", newline="") as f:
    for r in csv.DictReader(f, delimiter=";"):
        fg_ids.add(r["AccountID"])
dp = load("dim-produkt.csv")
dm = load("dim-markt.csv")
dsz = load("dim-szenario.csv")
do = load("dim-ort.csv")
dj = load("dim-jahr.csv")
dkpi = load("dim-kpi.csv")

sf_prod, sf_ctry, sf_scen = set(), set(), set()
with open(os.path.join(OUT, "sales-fact.csv"), "r", encoding="utf-8", newline="") as f:
    for r in csv.DictReader(f, delimiter=";"):
        sf_prod.add(r["Product"]); sf_ctry.add(r["Country"]); sf_scen.add(r["Scenario"])
fk_ort = set()
fk_jahr = set()
with open(os.path.join(OUT, "fact-klima.csv"), "r", encoding="utf-8", newline="") as f:
    for r in csv.DictReader(f, delimiter=";"):
        fk_ort.add(r["OrtID"]); fk_jahr.add(r["Jahr"])

fk_ok = (fg_ids <= {r["AccountID"] for r in dk}
         and sf_prod <= {r["Product"] for r in dp}
         and sf_ctry <= {r["Country"] for r in dm}
         and sf_scen <= {r["Scenario"] for r in dsz}
         and fk_ort <= {r["OrtID"] for r in do}
         and fk_jahr <= {r["Jahr"] for r in dj}
         and {m[4] for m in MARKETS} <= {r["Ort"] for r in do})
chk(18, "Alle Fremdschluessel aufloesbar", fk_ok,
    "fact-guv.AccountID (%d) -> dim-konten; sales-fact Product/Country/Scenario -> dims; "
    "fact-klima.OrtID -> dim-ort; fact-klima.Jahr -> dim-jahr; dim-markt.KlimaOrt -> dim-ort.Ort"
    % len(fg_ids))

uniq = []
for nm, rows, key in [("dim-konten.AccountID", dk, "AccountID"), ("dim-produkt.Product", dp, "Product"),
                      ("dim-markt.Country", dm, "Country"), ("dim-szenario.Scenario", dsz, "Scenario"),
                      ("dim-kpi.KPI", dkpi, "KPI"), ("dim-ort.OrtID", do, "OrtID"),
                      ("dim-ort.Ort", do, "Ort"), ("dim-jahr.Jahr", dj, "Jahr")]:
    vals = [r[key] for r in rows]
    uniq.append((nm, len(vals) == len(set(vals)), len(vals)))
chk(19, "Dim-Schluessel eindeutig", all(u[1] for u in uniq),
    ", ".join("%s %d %s" % (u[0], u[2], "ok" if u[1] else "DUPLIKAT") for u in uniq))

chk(20, "dim-kpi enthaelt exakt die 11 entpivotierten Spalten",
    [r["KPI"] for r in dkpi] == SALES_COLS[6:],
    ", ".join(r["KPI"] for r in dkpi))

# Dezimaltrennzeichen: numerische Spalten duerfen kein Komma enthalten
NUMCOLS = {
    "fact-guv.csv": ["AC", "PY", "PL", "FC", "FC_FY", "PL_FY"],
    "sales-fact.csv": SALES_COLS[6:],
    "dim-produkt.csv": ["Zielmarge_pct"],
    "dim-markt.csv": ["Breitengrad", "Laengengrad"],
    "dim-szenario.csv": ["Sortierung"],
    "dim-kpi.csv": ["Sortierung"],
    "dim-ort.csv": ["Breitengrad", "Laengengrad", "MittelC_1961_1990"],
    "fact-klima.csv": ["Jahr", "AnomalieC", "TemperaturC", "Anomalie_gleitend_10J"],
    "dim-jahr.csv": ["Jahr"],
    "gantt.csv": ["fortschritt_pct"],
    "guv-wasserfall.csv": ["Nr", "AC", "PY", "PL"],
}
comma_bad = []
for fn, cols in NUMCOLS.items():
    with open(os.path.join(OUT, fn), "r", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f, delimiter=";"):
            for c in cols:
                if "," in (r[c] or ""):
                    comma_bad.append((fn, c, r[c]))
                    break
            if comma_bad:
                break
chk(21, "Kein Komma als Dezimaltrennzeichen in Zahlenspalten", not comma_bad,
    "geprueft: " + ", ".join("%s(%d Sp.)" % (k, len(v)) for k, v in NUMCOLS.items()))

# ISO-Datum
date_bad = 0
with open(os.path.join(OUT, "gantt.csv"), "r", encoding="utf-8", newline="") as f:
    for r in csv.DictReader(f, delimiter=";"):
        for c in ("start", "ende"):
            v = r[c]
            if v and not (len(v) == 10 and v[4] == "-" and v[7] == "-"):
                date_bad += 1
chk(22, "gantt.csv Datumsspalten im ISO-Format", date_bad == 0,
    "%d Abweichungen" % date_bad)

# ===========================================================================
# 10) reconciliation.txt / README.md
# ===========================================================================
def guv_year_tot(l1, key, y):
    return l1_tot(l1, key, YIDX[y][0], YIDX[y][-1])


def guv_pnl_year(key, y):
    b = {n: guv_year_tot(n, key, y) for n in
         ["Net revenue", "Cost of goods sold", "Operating expenses", "Other operating result",
          "Depreciation & amortization", "Financial result", "Income taxes"]}
    return pnl_lines(b)


PNL_ORDER = ["Net revenue", "Cost of goods sold", "Gross profit", "Operating expenses",
             "Other operating result", "EBITDA", "Depreciation & amortization", "EBIT",
             "Financial result", "EBT", "Income taxes", "Net income"]

rec = []
rec.append("Abnahmewerte / Soll-Werte — ChartKitchen byDatenWG (merged)")
rec.append("Erzeugt von generate_merged_demo.py, Seed %d. Alle Betraege in mEUR." % SEED)
rec.append("")
rec.append("=" * 100)
rec.append("1) GuV — Konzern-P&L je Jahr (Levels-Modus, SignConvention angewandt)")
rec.append("=" * 100)
for y in GUV_YEARS:
    rec.append("")
    rec.append("--- Geschaeftsjahr %d ---" % y)
    rec.append("%-30s %12s %12s %12s %12s" % ("Zeile", "AC", "PY", "PL", "FC"))
    pn = {k: guv_pnl_year(k, y) for k in ("AC", "PY", "PL", "FC")}
    for n in PNL_ORDER:
        rec.append("%-30s %12.1f %12.1f %12.1f %12.1f"
                   % (n, pn["AC"][n] / MEUR, pn["PY"][n] / MEUR, pn["PL"][n] / MEUR, pn["FC"][n] / MEUR))
    r = pn["AC"]["Net revenue"]
    if r:
        rec.append("%-30s %11.1f%% %11.1f%% %11.1f%%"
                   % ("EBITDA-Marge % (AC/PY/PL)", pn["AC"]["EBITDA"] / r * 100,
                      pn["PY"]["EBITDA"] / (pn["PY"]["Net revenue"] or 1) * 100,
                      pn["PL"]["EBITDA"] / (pn["PL"]["Net revenue"] or 1) * 100))
    if y == 2026:
        rec.append("(AC 2026 endet mit 2026-08 — YTG-Luecke, FC fuellt 09-12 auf.)")

rec.append("")
rec.append("--- Abnahmefenster 2026-01 .. 2026-06 (Seitenfilter des Custom Visuals) ---")
rec.append("%-30s %12s %12s %12s   %s" % ("Zeile", "AC", "PY", "PL", "Alt-Datensatz AC"))
OLD_REF = {"Net revenue": 1664.6, "Cost of goods sold": -1081.4, "Gross profit": 583.2,
           "Operating expenses": -316.7, "Other operating result": 10.9, "EBITDA": 277.4,
           "Depreciation & amortization": -72.9, "EBIT": 204.5, "Financial result": -23.2,
           "EBT": 181.3, "Income taxes": -46.3, "Net income": 135.0}
for n in PNL_ORDER:
    rec.append("%-30s %12.1f %12.1f %12.1f   %12.1f"
               % (n, P["AC"][n] / MEUR, P["PY"][n] / MEUR, P["PL"][n] / MEUR, OLD_REF[n]))
rec.append("%-30s %11.1f%% (AC)  %11.1f%% (PL)"
           % ("EBITDA-Marge %", P["AC"]["EBITDA"] / P["AC"]["Net revenue"] * 100,
              P["PL"]["EBITDA"] / P["PL"]["Net revenue"] * 100))

rec.append("")
rec.append("--- Segment-Story (Net revenue AC/PL, 2026-01..06) ---")
for segname in ["Industrial Automation", "Energy Systems", "Mobility Solutions", "Digital Services"]:
    ac, pl, q = seg_ratio(segname, IDX_2026_01, IDX_2026_06)
    rec.append("%-24s AC %9.1f  PL %9.1f  AC/PL %6.1f%% (%+.1f%%)"
               % (segname, ac / MEUR, pl / MEUR, q * 100, (q - 1) * 100))

rec.append("")
rec.append("=" * 100)
rec.append("2) Sales — Summen je Szenario und Jahr")
rec.append("=" * 100)
rec.append("%-6s %6s %12s %12s %12s %12s %12s"
           % ("Szen.", "Jahr", "Revenue", "Cost", "Profit", "Units Sold", "Marketing"))
for scen, *_ in SCENARIOS:
    for y in (2023, 2024, 2025, 2026):
        pred = lambda r, s=scen, yy=y: r[0] == s and TL[r[1]][0] == yy
        rv = s_sum("Revenue", pred)
        if rv == 0:
            continue
        rec.append("%-6s %6d %12.2f %12.2f %12.2f %12d %12.2f"
                   % (scen, y, rv / MEUR, s_sum("Cost", pred) / MEUR, s_sum("Profit", pred) / MEUR,
                      int(s_sum("Units Sold", pred)), s_sum("Marketing Spend", pred) / MEUR))
rec.append("(AC 2026 nur Jan-Aug. Werte in mEUR, Units Sold in Stueck.)")

rec.append("")
rec.append("--- Sales AC je Region und Jahr (Revenue, mEUR) ---")
rec.append("%-10s %10s %10s %10s %10s" % ("Region", "2023", "2024", "2025", "2026*"))
for reg in ["EMEA", "Americas", "APAC"]:
    vals = [s_sum("Revenue", lambda r, rg=reg, yy=y: r[0] == "AC" and r[5] == rg and TL[r[1]][0] == yy) / MEUR
            for y in (2023, 2024, 2025, 2026)]
    rec.append("%-10s %10.2f %10.2f %10.2f %10.2f" % (reg, *vals))

rec.append("")
rec.append("--- Sales AC je Kategorie und Jahr (Revenue, mEUR) ---")
rec.append("%-18s %10s %10s %10s %10s" % ("Category", "2023", "2024", "2025", "2026*"))
for cat in ["Electronics", "Home Appliances", "Industrial IoT", "Services"]:
    vals = [s_sum("Revenue", lambda r, cc=cat, yy=y: r[0] == "AC" and r[3] == cc and TL[r[1]][0] == yy) / MEUR
            for y in (2023, 2024, 2025, 2026)]
    rec.append("%-18s %10.2f %10.2f %10.2f %10.2f" % (cat, *vals))

rec.append("")
rec.append("=" * 100)
rec.append("3) Klima-Stern")
rec.append("=" * 100)
rec.append("Orte: %d   Jahre: %d-%d   Faktzeilen: %d" % (len(PLACES), JAHRE[0], JAHRE[-1], n_klima))
dek = {}
for p in PLACES:
    for i, j in enumerate(p["jahre"]):
        dek.setdefault(j // 10 * 10, []).append(p["anom"][i])
rec.append("Mittlere Anomalie je Dekade (K):")
for d in sorted(dek):
    rec.append("  %ser  %+6.3f" % (d, statistics.fmean(dek[d])))

rec.append("")
rec.append("=" * 100)
rec.append("4) Selbstpruefung der 10 Storys + Integritaet")
rec.append("=" * 100)
for nr, name, ok, detail in CHECKS:
    rec.append("[%s] %2d %s" % ("OK  " if ok else "FAIL", nr, name))
    rec.append("        %s" % detail)

rec.append("")
rec.append("=" * 100)
rec.append("5) Dateien")
rec.append("=" * 100)
rec.append("%-22s %10s %8s %12s" % ("Datei", "Zeilen", "Spalten", "Bytes"))
for fn, nrow, ncol, nby, bom in file_stats:
    rec.append("%-22s %10d %8d %12d" % (fn, nrow, ncol, nby))

with open(os.path.join(OUT, "reconciliation.txt"), "w", encoding="utf-8", newline="\r\n") as f:
    f.write("\n".join(rec) + "\n")

# --- README -----------------------------------------------------------------
n_ok = sum(1 for c in CHECKS if c[2])
readme = """# Demodaten „ChartKitchen byDatenWG" (merged)

Erzeugt von `generate_merged_demo.py` (Seed `%d`, nur Standardbibliothek,
kein Netzwerk, zweimaliges Ausfuehren liefert byte-identische Dateien).
Verbindlicher Kontrakt: `CONTRACT.md`.

**Globale Konventionen:** Trennzeichen `;`, UTF-8 **ohne** BOM, Dezimaltrennzeichen `.`,
ISO-Datum `YYYY-MM-DD`, keine Tausendertrennzeichen, Zeilenende `\\r\\n`.

## Dateien

| Datei | Zeilen | Spalten | Inhalt |
|---|---:|---:|---|
%s

## 1. Stern „P&L" (Konzern-GuV)

* `dim-konten.csv` — **unveraenderte Byte-Kopie** aus `demoData/industrial/`.
  5.000 Zeilen, `SortOrder` = 6 x Zeilenposition, Levels-Modus (`L1`…`L6`)
  und Parent-Child-Modus (`ParentAccountID`) in einer Datei.
* `fact-guv.csv` — 5.000 Konten x 36 Monate (**2024-01 … 2026-12**) = **180.000 Zeilen**.
  Spalten `AccountID;Monat;Datum;AC;PY;PL;FC;FC_FY;PL_FY`, Werte in **EUR**.
  * Zeilenreihenfolge = Dim-Reihenfolge (SortOrder) x Monat aufsteigend.
    Im Seitenfilter **2026-01 … 2026-06** entspricht der DataView-Index damit
    exakt der `SortOrder`-Skala (6 x Zeilenposition) — das Custom Visual sortiert korrekt.
  * `AC` ist **leer** ab 2026-09 (Redaktionsschluss „heute" = 2026-08-24), `FC` fuellt auf.
  * `FC_FY` / `PL_FY` sind Jahres-Skalare, auf jeder Monatszeile des Jahres identisch
    (Measure muss `MAX` sein, nicht `SUM`).
  * Knoten-, Formel-, KPI- und Separator-Zeilen bekommen Faktzeilen mit 0, damit
    sie nicht aus dem DataView fallen.

## 2. Stern „Sales & Financial"

* `sales-fact.csv` — breit, 17 Spalten; die 11 rechten werden in M entpivotiert
  (`KPI` / `Value`). `Cost` = `COGS` + `Discount` + `Marketing Spend`,
  `Profit` = `Revenue` - `Cost` (zeilenweise exakt auf 2 Nachkommastellen).
  12 Produkte x 18 Laender x 48 Monate (2023-01 … 2026-12) x 6 Szenarien;
  `AC` endet mit 2026-08.
* `dim-produkt.csv` (12) · `dim-markt.csv` (18) · `dim-szenario.csv` (6) · `dim-kpi.csv` (11).
* `dim-markt.KlimaOrt` ist die Bruecke zum Klima-Stern (`dim-ort.Ort`).

## 3. Stern „Klima" (Waermestreifen)

* `dim-ort.csv` (60) · `fact-klima.csv` (10.560 = 60 x 176) · `dim-jahr.csv` (176, 1850-2025).
* `TemperaturC` = `MittelC_1961_1990` + `AnomalieC`;
  `Anomalie_gleitend_10J` = zentriertes 10-Jahres-Mittel (Raender mit kuerzerem Fenster).

## 4. Uebernahmen

* `gantt.csv` und `guv-wasserfall.csv` — Inhalte der Quelldateien, umgestellt auf
  `;`, UTF-8 ohne BOM, ISO-Datum und `.` als Dezimaltrennzeichen. Spaltennamen unveraendert.

## Trend-Engine

Kein weisses Rauschen: 60 z-standardisierte Temperaturanomalie-Reihen (1850-2025)
liefern Autokorrelation, Trendbrueche und Volatilitaets-Cluster. Jede Business-Entitaet
bekommt per `sha256(SEED|key)` deterministisch (Ort, Startjahr-Offset); die letzten 48
Jahre der Reihe werden auf die 48 Monate der Business-Zeitachse gelegt und als
`faktor = exp(alpha * z)` multiplikativ ueberlagert (`alpha` 0.03 … 0.12 je KPI-Gruppe).
Segment-, Regions- und Einzelsignal werden gewichtet gemischt — deshalb reagieren alle
Konten eines Segments sichtbar auf „ihre" Klimareihe (Story 9). Details im Skript-Docstring.

## Eingebaute Storys

| # | Story | Wo |
|---|---|---|
| 1 | Produkt-Launch „Neuro Hub" ab 2025-07, Hockeystick | Sales |
| 2 | Lieferketten-Schock 2024-Q3/Q4, COGS-Quote +18 %%, Erholung ab 2025-Q2 | Sales + P&L |
| 3 | Auslaufprodukt „Coffee Machine": Volumen -40 %%, Rabatt steigt | Sales |
| 4 | Turnaround Brasilien: 2023/24 tief rot, ab 2025-Q3 ueber Plan | Sales |
| 5 | Mid-Year-Konsolidierung (Entity 3140) ab 2025-04, PY leer | P&L |
| 6 | Marketing-Push EMEA 2026-H1 (+60 %%), Revenue folgt mit 2 Monaten Verzug | Sales |
| 7 | Qualitaetsvorfall 2025-11/12: Retouren x3, CSAT -12 Punkte | Sales |
| 8 | Mobility Solutions ~-7 %% unter Plan, Energy + Digital kompensieren | P&L |
| 9 | Energiepreis-Kopplung: Segment-Konten folgen der Klima-Treiberserie | P&L <-> Klima |
| 10 | YTG-Luecke 2026: AC endet 2026-08, FC fuellt 09-12, PL laeuft durch | beide Sterne |

Ausserdem erhalten: 115 ruhende Konten (ueberall 0), 3 Orphan-Konten
(`899001…899003-9999`, Parent `N-CONS-ELIM` existiert nicht), Kommentar-Konten,
Formel-/KPI-/Separator-Zeilen.

## Abnahmewerte 2026-01 … 2026-06 (mEUR)

| Zeile | AC | PY | PL | Alt-Datensatz AC |
|---|---:|---:|---:|---:|
%s

Vollstaendige Soll-Werte (je Jahr, je Szenario, je Region/Kategorie) und das
Ergebnis aller %d Selbstpruefungen: `reconciliation.txt` (%d/%d OK).

## Abweichungen vom Kontrakt (bewusst, mit Begruendung)

1. **`dim-ort.Ort` — 3 Namen disambiguiert.** In `waermestreifen_demo.csv` kommen
   *Berlin*, *London* und *Moskau* jeweils zweimal vor (Region `Europa` **und** `Welt`).
   Bei 60 Zeilen waere `Ort` damit kein eindeutiger Schluessel und die im Kontrakt
   geforderte Beziehung `dim-markt.KlimaOrt` -> `dim-ort.Ort` liesse sich in Power BI
   nicht anlegen. Das zweite Auftreten heisst deshalb `Berlin (Welt)`, `London (Welt)`,
   `Moskau (Welt)`. `OrtID`, Zeilenzahl (60) und alle Werte bleiben unveraendert;
   `dim-markt.KlimaOrt` referenziert ausschliesslich eindeutige Namen.
2. **Kommentar-Konten: 3 statt 5.** `dim-konten.csv` ist eine Byte-Kopie — die
   Alt-Datei enthaelt tatsaechlich nur 3 befuellte `Kommentar`-Felder (Halbleiter-
   Spotkaeufe, Seefracht, FX-Verlust). Der Kontrakt nennt 5. Nicht korrigierbar,
   ohne die Byte-Kopie zu verletzen.
3. **Story 6 „Marketing Spend +60 %%".** Die +60 %% sind als **Marketing-Quote**
   (Spend je EUR Umsatz, EMEA 2026-H1 vs. 2025-H1) umgesetzt — das ist der Push
   selbst. Absolut steigt der Spend staerker (~+125 %%), weil der Neuro-Hub-Ramp
   parallel Umsatz und damit Marketingbudget bringt. Beide Zahlen stehen in
   `reconciliation.txt`.
4. **Neuro Hub vor dem Launch.** Zeilen vor 2025-07 existieren (fuer den
   Hockeystick ab 0), alle Betraege/Mengen sind `0`, nur `Customer Satisfaction`
   ist **leer** — sonst wuerde ein AVERAGE-Measure durch Nullen verzerrt.
5. **0-Zeilen nach 2026-08.** Knoten-, Formel-, KPI-, Separator- und die 115
   ruhenden Konten fuehren `AC = 0` auch fuer 2026-09..12 (statt leer), damit sie
   nicht aus dem DataView fallen bzw. „ueberall 0" bleiben. Alle echten,
   bebuchten Konten haben dort korrekt ein **leeres** `AC` (YTG-Luecke).
6. **Sales-Zeitachse.** Der Kontrakt nennt 2023-01 … 2026-12; die GuV startet
   laut Kontrakt bei 2024-01. Intern laeuft die Trend-Engine fuer beide Sterne
   ueber dieselben 48 Monate ab 2023-01 — das Schattenjahr 2023 liefert die
   `PY`-Werte fuer 2024 und wird in `fact-guv.csv` **nicht** ausgegeben.
""" % (
    SEED,
    "\n".join("| `%s` | %d | %d | %s |" % (
        fn, nrow, ncol,
        {"dim-konten.csv": "Kontenhierarchie (Byte-Kopie)",
         "fact-guv.csv": "GuV-Fakten 2024-01…2026-12",
         "sales-fact.csv": "Sales-Fakten breit, 6 Szenarien",
         "dim-produkt.csv": "Produkte", "dim-markt.csv": "Laender/Regionen",
         "dim-szenario.csv": "Szenarien (IBCS)", "dim-kpi.csv": "KPI-Metadaten",
         "dim-ort.csv": "Klima-Orte", "fact-klima.csv": "Temperaturanomalien",
         "dim-jahr.csv": "Jahre 1850-2025", "gantt.csv": "Projektplan",
         "guv-wasserfall.csv": "GuV-Wasserfall"}[fn])
              for fn, nrow, ncol, nby, bom in file_stats),
    "\n".join("| %s | %.1f | %.1f | %.1f | %.1f |"
              % (n, P["AC"][n] / MEUR, P["PY"][n] / MEUR, P["PL"][n] / MEUR, OLD_REF[n])
              for n in PNL_ORDER),
    len(CHECKS), n_ok, len(CHECKS),
)

with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8", newline="\r\n") as f:
    f.write(readme)

# ===========================================================================
# Konsolen-Report
# ===========================================================================
print("Ausgabeordner: %s" % OUT)
print("%-22s %10s %8s %12s" % ("Datei", "Zeilen", "Spalten", "Bytes"))
for fn, nrow, ncol, nby, bom in file_stats:
    print("%-22s %10d %8d %12d" % (fn, nrow, ncol, nby))
print()
for nr, name, ok, detail in CHECKS:
    print("[%s] %2d %s" % ("OK  " if ok else "FAIL", nr, name))
    print("        %s" % detail)
print()
print("%d/%d Pruefungen bestanden." % (n_ok, len(CHECKS)))
if n_ok != len(CHECKS):
    sys.exit(1)
