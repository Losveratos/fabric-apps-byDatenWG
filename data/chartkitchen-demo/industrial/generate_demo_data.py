# -*- coding: utf-8 -*-
"""
Demo-Datengenerator für "P&L Statement byDatenWG" v0.3 — Industriekonzern.

Erzeugt:
  dim-konten.csv   — exakt 5.000 Zeilen (Leaves + PC-Knoten + Formel/KPI/Separator + Orphans)
  fact-guv.csv     — exakt 30.000 Zeilen (jede Dim-Zeile × 6 Monate, Jan–Jun 2026)

Design-Regeln (aus dem Visual-Parser v0.3.0.0 abgeleitet):
  * Levels-Modus: Pfad endet bei leerem/wiederholtem Level; Zeilen mit komplett
    leeren L-Spalten werden übersprungen -> PC-Knotenzeilen haben L1..L6 leer.
  * Formel-Referenzen [X] lösen über AccountID, sonst über EINDEUTIGEN Namen auf
    -> referenzierte Top-Level-Namen sind global eindeutig.
  * SignConvention wird VOR Formeln/Summen anmultipliziert; Kostenwerte stehen
    positiv in der Faktentabelle (sign -1, DisplayInvert true).
  * FC_FY/PL_FY: Jahres-Skalare, identisch auf jeder Monatszeile (Measure: MAX).
  * Jede Dim-Zeile bekommt 6 Faktzeilen (Knoten/Formeln mit 0), damit keine
    Zeile aus dem DataView fällt und exakt 30.000 Zeilen erreicht werden.
"""
import csv
import random
import os

random.seed(20260802)
OUT = os.path.dirname(os.path.abspath(__file__))

MONTHS = [f"2026-{m:02d}" for m in range(1, 7)]
SEASON_H1 = [0.94, 0.90, 1.10, 0.98, 1.00, 1.12]   # Jan..Jun
SEASON_H2 = [0.92, 0.85, 1.08, 1.02, 1.04, 1.15]   # Jul..Dez
M = 1_000_000.0

TOTAL_DIM_ROWS = 5000

# ----------------------------------------------------------------------------
# Kategorien: (monatl. Plan-Summe in mEUR, Plan-Wachstum vs PY, Ist/Plan-Faktor)
# ----------------------------------------------------------------------------
CAT = {
    ("REV+", "IA"): (108.0, 0.05, 1.02), ("REV+", "ES"): (76.0, 0.10, 1.09),
    ("REV+", "MS"): (62.0, 0.04, 0.93), ("REV+", "DS"): (37.0, 0.15, 1.12),
    ("REV-", "IA"): (5.0, 0.05, 1.01), ("REV-", "ES"): (3.4, 0.10, 1.06),
    ("REV-", "MS"): (3.0, 0.04, 0.99), ("REV-", "DS"): (1.6, 0.15, 1.08),
    ("COGS", "Material"): (98.0, 0.06, 1.03), ("COGS", "Fertigung"): (52.0, 0.05, 1.00),
    ("COGS", "Fremd"): (18.0, 0.07, 0.97), ("COGS", "Fracht"): (10.0, 0.04, 1.08),
    ("OPEX", "SM"): (22.0, 0.06, 1.03), ("OPEX", "RD"): (15.0, 0.09, 0.98),
    ("OPEX", "GA"): (10.0, 0.03, 0.99), ("OPEX", "IT"): (5.0, 0.08, 1.06),
    ("OOR", "inc"): (4.0, 0.02, 1.15), ("OOR", "exp"): (2.5, 0.02, 1.10),
    ("DA", "all"): (12.0, 0.05, 1.00),
    ("FIN", "inc"): (0.8, 0.00, 0.90), ("FIN", "exp"): (4.0, 0.02, 1.12),
    ("TAX", "all"): (7.9, 0.05, 0.97),
}

# ----------------------------------------------------------------------------
# Struktur
# ----------------------------------------------------------------------------
SEGMENTS = {
    "IA": "Industrial Automation", "ES": "Energy Systems",
    "MS": "Mobility Solutions", "DS": "Digital Services",
}
REGIONS = ["EMEA", "Americas", "APAC"]

ENTITIES = {  # (segment, region) -> [(code, name)]
    ("IA", "EMEA"): [("1100", "DWG Automation GmbH"), ("1110", "DWG Automation France S.A.S."),
                     ("1120", "DWG Automation UK Ltd."), ("1130", "DWG Automation Italia S.r.l."),
                     ("1140", "DWG Automation Polska Sp. z o.o."), ("1150", "DWG Drives Nordic AB")],
    ("IA", "Americas"): [("1200", "DWG Automation Inc."), ("1210", "DWG Automation do Brasil Ltda."),
                         ("1220", "DWG Automation México S.A. de C.V."), ("1230", "DWG Robotics Canada Inc.")],
    ("IA", "APAC"): [("1300", "DWG Automation (Shanghai) Co. Ltd."), ("1310", "DWG Automation K.K."),
                     ("1320", "DWG Automation India Pvt. Ltd."), ("1330", "DWG Automation Korea Co. Ltd."),
                     ("1340", "DWG Automation SEA Pte. Ltd.")],
    ("ES", "EMEA"): [("2100", "DWG Energy GmbH"), ("2110", "DWG Wind Ibérica S.A."),
                     ("2120", "DWG Grid Solutions B.V."), ("2130", "DWG Energy France S.A.S."),
                     ("2140", "DWG Solar Hellas S.A.")],
    ("ES", "Americas"): [("2200", "DWG Energy Systems Inc."), ("2210", "DWG Energia do Brasil Ltda."),
                         ("2220", "DWG Storage US LLC")],
    ("ES", "APAC"): [("2300", "DWG Energy (Suzhou) Co. Ltd."), ("2310", "DWG Energy Australia Pty. Ltd."),
                     ("2320", "DWG Energy Vietnam Co. Ltd."), ("2330", "DWG Grid India Pvt. Ltd.")],
    ("MS", "EMEA"): [("3100", "DWG Mobility GmbH"), ("3110", "DWG Mobility Components s.r.o."),
                     ("3120", "DWG Drivetrain Hungária Kft."), ("3130", "DWG Mobility UK Ltd."),
                     ("3140", "DWG Mobility Ibérica S.L.")],   # ab April konsolidiert!
    ("MS", "Americas"): [("3200", "DWG Mobility North America Inc."), ("3210", "DWG Mobility de México S.A."),
                         ("3220", "DWG Aftermarket US LLC")],
    ("MS", "APAC"): [("3300", "DWG Mobility (Changchun) Co. Ltd."), ("3310", "DWG Mobility Thailand Co. Ltd."),
                     ("3320", "DWG Mobility Japan K.K.")],
}
MIDYEAR_ENTITY = "3140"  # AC/PL erst ab April, PY komplett leer

PRODUCT_LINES = {
    "IA": ["Sensorik", "Antriebstechnik", "Robotik", "Steuerungstechnik", "Industrial Software"],
    "ES": ["Windkraftkomponenten", "Solartechnik", "Netztechnik", "Speichersysteme", "Service & Wartung"],
    "MS": ["E-Mobility Komponenten", "Fahrwerkstechnik", "Antriebsstrang", "Aftermarket"],
}

REV_ACCOUNTS = [  # (Basisname, Kontonr-Basis, sign, kategorie REV+/REV-)
    ("Produkterlöse Inland", 400100, 1, "REV+"), ("Produkterlöse Export", 400200, 1, "REV+"),
    ("Serviceerlöse", 402010, 1, "REV+"), ("Ersatzteilerlöse", 402500, 1, "REV+"),
    ("Lizenzerlöse", 403100, 1, "REV+"), ("Projekterlöse", 404000, 1, "REV+"),
    ("Erlösschmälerungen & Boni", 410100, -1, "REV-"), ("Skonti & Rabatte", 410200, -1, "REV-"),
]
DS_ACCOUNTS = [
    ("SaaS-Plattform Erlöse", 405100, 1, "REV+"), ("IoT-Analytics Erlöse", 405200, 1, "REV+"),
    ("Managed Services Erlöse", 405300, 1, "REV+"), ("Beratungserlöse", 405400, 1, "REV+"),
    ("Schulungserlöse", 405500, 1, "REV+"), ("Support-Verträge", 405600, 1, "REV+"),
    ("Marketplace-Provisionen", 405700, 1, "REV+"), ("Einführungsprojekte", 405800, 1, "REV+"),
    ("Gutschriften Cloud-SLA", 411100, -1, "REV-"), ("Partnerrabatte", 411200, -1, "REV-"),
]

MATERIAL_POOL = ["Rohstoffe Stahl", "Rohstoffe Aluminium", "Rohstoffe Kupfer", "Halbleiter",
                 "Elektronikkomponenten", "Kaufteile Mechanik", "Kaufteile Hydraulik", "Normteile",
                 "Kabel & Leitungen", "Gehäuse & Bleche", "Kunststoffgranulat", "Magnete Seltene Erden",
                 "Batteriezellen", "Leiterplatten", "Verpackungsmaterial", "Betriebsstoffe",
                 "Hilfsstoffe", "Werkzeugverschleiß", "Bestandsveränderung Material", "Wareneinsatz Handelsware"]
FERTIGUNG_POOL = ["Fertigungslöhne", "Maschinenkosten", "Energie Fertigung", "Instandhaltung Anlagen",
                  "Qualitätssicherung", "Ausschuss & Nacharbeit", "Fertigungsgemeinkosten", "Rüstkosten",
                  "Lagerkosten Fertigung", "Fertigungsplanung", "Arbeitsvorbereitung", "Montagekosten"]
FREMD_POOL = ["Verlängerte Werkbank", "Lohnfertigung extern", "Konstruktionsdienstleistungen",
              "Prüfdienstleistungen", "Cloud-Hosting COGS", "Externe Projektleistungen",
              "Subunternehmer Montage", "Zertifizierungskosten"]
FRACHT_POOL = ["Eingangsfrachten", "Ausgangsfrachten", "Seefracht", "Luftfracht", "Zölle & Abgaben",
               "Verzollungskosten", "Transportversicherung", "Expressfrachten"]
SM_POOL = ["Personal Vertrieb", "Provisionen", "Reisekosten Vertrieb", "Messen & Events",
           "Werbung & Kampagnen", "Digital Marketing", "Vertriebsbüros Miete", "Kundenbewirtung",
           "Vertriebsunterstützung", "Marktforschung", "CRM-Lizenzen", "Angebotskosten"]
RD_POOL = ["Personal F&E", "Prototypenbau", "Testequipment", "Externe Entwicklung", "Patente & Schutzrechte",
           "Laborbedarf", "Simulationssoftware", "Zulassung & Normung", "Forschungskooperationen",
           "Versuchsmaterial"]
GA_POOL = ["Personal Verwaltung", "Geschäftsführung", "Rechts- & Beratungskosten", "Wirtschaftsprüfung",
           "Versicherungen", "Gebäudekosten Verwaltung", "Kommunikationskosten", "Büromaterial",
           "Personalentwicklung", "Rekrutierung", "Compliance & Audit", "Spenden & Mitgliedschaften",
           "Fuhrpark Verwaltung", "Nebenkosten Verwaltung"]
IT_POOL = ["Cloud-Infrastruktur", "SaaS-Lizenzen", "IT-Personal", "IT-Security", "Netzwerkkosten",
           "Hardware-Leasing", "IT-Beratung", "Helpdesk & Support", "ERP-Wartung", "Datenleitungen"]
OOR_INC_POOL = ["Erträge aus Anlagenabgängen", "Auflösung Rückstellungen", "Versicherungsentschädigungen",
                "Mieterträge", "Zuschüsse & Förderungen", "Erträge Vorjahre", "Kursgewinne operativ",
                "Übrige betriebliche Erträge", "Erträge aus Weiterbelastung", "Schrottverkäufe"]
OOR_EXP_POOL = ["Verluste aus Anlagenabgängen", "Zuführung Rückstellungen", "Wertberichtigung Forderungen",
                "Kursverluste operativ", "Restrukturierungsaufwand", "Sonstige Steuern",
                "Aufwand Vorjahre", "Übrige betriebliche Aufwendungen"]
DA_POOLS = {
    "Sachanlagen": ["AfA Maschinen", "AfA Gebäude", "AfA Betriebsausstattung", "AfA Werkzeuge",
                    "AfA Fahrzeuge", "AfA Technische Anlagen", "Sonderabschreibungen Sachanlagen"],
    "Immaterielle Vermögenswerte": ["AfA Software", "AfA Entwicklungskosten", "AfA Kundenstamm",
                                    "AfA Markenrechte", "Impairment Goodwill-Test"],
    "Nutzungsrechte (IFRS 16)": ["AfA Nutzungsrechte Gebäude", "AfA Nutzungsrechte Fahrzeuge",
                                 "AfA Nutzungsrechte IT"],
}
FIN_ACCOUNTS = [("Zinserträge", 700100, 1, "inc"), ("Erträge aus Wertpapieren", 700200, 1, "inc"),
                ("Zinsaufwand Anleihen", 750100, -1, "exp"), ("Zinsaufwand Bankdarlehen", 750200, -1, "exp"),
                ("Zinsaufwand Leasing (IFRS 16)", 750300, -1, "exp"), ("Avalprovisionen", 750400, -1, "exp"),
                ("FX-Verluste Finanzierung", 750110, -1, "exp"), ("FX-Gewinne Finanzierung", 700110, 1, "inc"),
                ("Bankgebühren", 750500, -1, "exp"), ("Zinsanteil Pensionsrückstellungen", 750600, -1, "exp")]
TAX_ACCOUNTS = [("Körperschaftsteuer Inland", 770100, -1), ("Gewerbesteuer", 770200, -1),
                ("Ausländische Ertragsteuern", 770300, -1), ("Latente Steuern", 770400, -1),
                ("Quellensteuern", 770500, -1), ("Steuern Vorjahre", 770600, -1)]

COMMENTS = {
    # AccountID-Muster -> Kommentartext (wird unten an konkrete Leaves gebunden)
}

# ----------------------------------------------------------------------------
# Aufbau: Knoten & Leaves
# ----------------------------------------------------------------------------
dim_rows = []          # finale Dim-Zeilen (dicts) in Anzeige-Reihenfolge
nodes_by_id = {}
leaves = []            # dicts mit Wertparametern

def add_node(nid, parent, name, sign=1, disp_inv=False, var_inv=False):
    assert nid not in nodes_by_id, nid
    n = {"AccountID": nid, "ParentAccountID": parent or "", "Name": name,
         "RowType": "Subtotal", "FormulaDef": "", "SignConvention": sign,
         "DisplayInvert": disp_inv, "VarianceInvert": var_inv, "Kommentar": "",
         "_levels": [""] * 6, "_kind": "node", "_children": []}
    nodes_by_id[nid] = n
    if parent:
        nodes_by_id[parent]["_children"].append(n)
    return n

def add_leaf(acct_no, ent_code, name, parent_id, path, sign, cat, disp_inv, var_inv,
             comment="", dormant=False, midyear=False):
    aid = f"{acct_no}-{ent_code}" if ent_code else str(acct_no)
    lv = list(path) + [name]
    assert len(lv) <= 6, (aid, lv)
    lv += [""] * (6 - len(lv))
    leaf = {"AccountID": aid, "ParentAccountID": parent_id, "Name": name,
            "RowType": "Account", "FormulaDef": "", "SignConvention": sign,
            "DisplayInvert": disp_inv, "VarianceInvert": var_inv, "Kommentar": comment,
            "_levels": lv, "_kind": "leaf", "_children": [],
            "_cat": cat, "_w": random.lognormvariate(0, 1.05),
            "_dormant": dormant, "_midyear": midyear}
    nodes_by_id[parent_id]["_children"].append(leaf)
    leaves.append(leaf)
    return leaf

def uniq_name(base, used):
    if base not in used:
        used.add(base)
        return base
    i = 2
    while f"{base} {i}" in used:
        i += 1
    used.add(f"{base} {i}")
    return f"{base} {i}"

# --- Block 1: Net revenue -----------------------------------------------------
add_node("N-REV", None, "Net revenue")
for sg, sgname in SEGMENTS.items():
    add_node(f"N-REV-{sg}", "N-REV", sgname)
    if sg == "DS":
        for rg in ["EMEA", "Americas"]:
            rid = f"N-REV-DS-{rg}"
            add_node(rid, "N-REV-DS", rg)
            for nm, no, s, cat in DS_ACCOUNTS:
                add_leaf(no, "40" + ("01" if rg == "EMEA" else "02"), nm, rid,
                         ["Net revenue", sgname, rg], s, ("REV" + ("+" if s > 0 else "-"), "DS"),
                         False, s < 0)
        continue
    for rg in REGIONS:
        rid = f"N-REV-{sg}-{rg}"
        add_node(rid, f"N-REV-{sg}", rg)
        for code, ename in ENTITIES[(sg, rg)]:
            eid = f"N-REV-{sg}-{rg}-{code}"
            add_node(eid, rid, ename)
            for pi, pl in enumerate(PRODUCT_LINES[sg]):
                pid = f"{eid}-P{pi+1}"
                add_node(pid, eid, pl)
                base = random.sample(REV_ACCOUNTS, k=random.choice([5, 6, 6, 7]))
                if not any(s < 0 for _, _, s, _ in base):
                    base.append(REV_ACCOUNTS[6])
                for nm, no, s, cat in base:
                    lic = nm == "Lizenzerlöse" and code == "1300" and pl == "Industrial Software"
                    add_leaf(no + pi, code, nm, pid,
                             ["Net revenue", sgname, rg, ename, pl], s, (cat, sg),
                             False, s < 0,
                             comment=("Lizenzmodell China seit Feb umgestellt: Einmalerlös 2,8 mEUR "
                                      "aus Nachlizenzierung Industrial Software." if lic else ""),
                             midyear=(code == MIDYEAR_ENTITY))

# --- Block 2: Cost of goods sold ----------------------------------------------
add_node("N-COGS", None, "Cost of goods sold", sign=-1, disp_inv=True, var_inv=True)
COST_TYPES = [("MAT", "Materialaufwand", "Material", 500000, MATERIAL_POOL),
              ("FER", "Fertigungskosten", "Fertigung", 510000, FERTIGUNG_POOL),
              ("FRE", "Fremdleistungen", "Fremd", 520000, FREMD_POOL),
              ("FRA", "Frachten & Zölle", "Fracht", 530000, FRACHT_POOL)]
for ct, ctname, cat, base_no, pool in COST_TYPES:
    ctid = f"N-COGS-{ct}"
    add_node(ctid, "N-COGS", ctname, sign=-1, disp_inv=True, var_inv=True)
    if ct == "FRA":  # flach: Kostenart -> Region -> Konten (Tiefe 4)
        for ri, rg in enumerate(REGIONS):
            rid = f"{ctid}-{rg}"
            add_node(rid, ctid, rg, sign=-1, disp_inv=True, var_inv=True)
            used = set()
            for ai, nm in enumerate(pool):
                nm = uniq_name(nm, used)
                cm = ("Frachtraten Übersee +38 % vs. Plan (Rotes Meer); Umroutung "
                      "über Kap der Guten Hoffnung." if nm == "Seefracht" and rg == "EMEA" else "")
                add_leaf(base_no + ri * 100 + ai, "", nm, rid,
                         ["Cost of goods sold", ctname, rg], -1, ("COGS", cat), True, True, comment=cm)
        continue
    if ct == "FRE":  # Kostenart -> Segment -> Konten (Tiefe 4)
        for sg, sgname in SEGMENTS.items():
            sid = f"{ctid}-{sg}"
            add_node(sid, ctid, sgname, sign=-1, disp_inv=True, var_inv=True)
            used = set()
            for ai, nm in enumerate(pool):
                nm = uniq_name(nm, used)
                add_leaf(base_no + ai, "9" + sg[0] + str(ai % 10), nm, sid,
                         ["Cost of goods sold", ctname, sgname], -1, ("COGS", cat), True, True)
        continue
    # MAT/FER: Kostenart -> Segment -> Entity -> Konten (Tiefe 5)
    for sg, sgname in SEGMENTS.items():
        if sg == "DS" and ct == "FER":
            continue
        sid = f"{ctid}-{sg}"
        add_node(sid, ctid, sgname, sign=-1, disp_inv=True, var_inv=True)
        if sg == "DS":  # DS ohne Entities: Konten direkt (ragged)
            used = set()
            for ai, nm in enumerate(["Content-Lizenzen", "Datenzukauf", "Plattform-Wareneinsatz"]):
                add_leaf(base_no + 900 + ai, "4001", nm, sid,
                         ["Cost of goods sold", ctname, sgname], -1, ("COGS", cat), True, True)
            continue
        for rg in REGIONS:
            for code, ename in ENTITIES[(sg, rg)]:
                eid = f"{sid}-{code}"
                add_node(eid, sid, ename, sign=-1, disp_inv=True, var_inv=True)
                k = random.choice([6, 7, 8]) if ct == "MAT" else random.choice([5, 6])
                used = set()
                for ai, nm in enumerate(random.sample(pool, k=min(k, len(pool)))):
                    nm = uniq_name(nm, used)
                    cm = ("Allokationskrise Halbleiter: Spotmarkt-Zukäufe +3,1 mEUR "
                          "über Plan (Jan–Mrz)." if nm == "Halbleiter" and code == "1100" else "")
                    add_leaf(base_no + ai, code, nm, eid,
                             ["Cost of goods sold", ctname, sgname, ename], -1, ("COGS", cat),
                             True, True, comment=cm, midyear=(code == MIDYEAR_ENTITY))

# --- Formel/KPI-Zeilen Ebene 1 (Reihenfolge siehe TOP_ORDER unten) -------------
def special(aid, name, rowtype, formula, l1=None, var_inv=False):
    return {"AccountID": aid, "ParentAccountID": "", "Name": name, "RowType": rowtype,
            "FormulaDef": formula, "SignConvention": 1, "DisplayInvert": False,
            "VarianceInvert": var_inv, "Kommentar": "",
            "_levels": [l1 if l1 is not None else name] + [""] * 5,
            "_kind": "special", "_children": []}

SPECIALS = {
    "F-GP": special("F-GP", "Gross profit", "Formula", "[Net revenue] + [Cost of goods sold]"),
    "K-GM": special("K-GM", "Gross margin %", "KPI", "[Gross profit] / [Net revenue]"),
    "SEP-1": special("SEP-1", "———", "Separator", "", l1="———"),
    "F-EBITDA": special("F-EBITDA", "EBITDA", "Formula",
                        "[Gross profit] + [Operating expenses] + [Other operating result]"),
    "K-EBITDA": special("K-EBITDA", "EBITDA margin %", "KPI", "[EBITDA] / [Net revenue]"),
    "SEP-2": special("SEP-2", "———", "Separator", "", l1="———"),
    "F-EBIT": special("F-EBIT", "EBIT", "Formula", "[EBITDA] + [Depreciation & amortization]"),
    "F-EBT": special("F-EBT", "EBT", "Formula", "[EBIT] + [Financial result]"),
    "F-NI": special("F-NI", "Net income", "Formula", "[EBT] + [Income taxes]"),
    "K-NM": special("K-NM", "Net margin %", "KPI", "[Net income] / [Net revenue]"),
}

# --- Block 3: Operating expenses ------------------------------------------------
add_node("N-OPEX", None, "Operating expenses", sign=-1, disp_inv=True, var_inv=True)
add_node("N-OPEX-SM", "N-OPEX", "Sales & Marketing", sign=-1, disp_inv=True, var_inv=True)
for rg in REGIONS:
    rid = f"N-OPEX-SM-{rg}"
    add_node(rid, "N-OPEX-SM", rg, sign=-1, disp_inv=True, var_inv=True)
    for ci, cc in enumerate(["Direktvertrieb", "Partnervertrieb", "Marketing", "Vertriebsinnendienst"]):
        cid = f"{rid}-C{ci+1}"
        add_node(cid, rid, cc, sign=-1, disp_inv=True, var_inv=True)
        used = set()
        for ai, nm in enumerate(random.sample(SM_POOL, k=random.choice([5, 6, 7]))):
            nm = uniq_name(nm, used)
            add_leaf(600000 + ci * 100 + ai, "8" + rg[:2].upper(), nm, cid,
                     ["Operating expenses", "Sales & Marketing", rg, cc], -1, ("OPEX", "SM"), True, True)

add_node("N-OPEX-RD", "N-OPEX", "Research & Development", sign=-1, disp_inv=True, var_inv=True)
RD_PROGRAMS = [("Automation Next", ["Edge-控制 Plattform", "Safety-Robotik", "Vision-Systeme"]),
               ("Green Energy", ["Elektrolyse-Stack", "HGÜ-Komponenten", "Batterierecycling"]),
               ("Future Mobility", ["800V-Antrieb", "Radnabenmotor", "Brennstoffzellen-BoP"]),
               ("Digital Platform", ["IoT-Backbone", "KI-Diagnostik"])]
RD_PROGRAMS[0] = ("Automation Next", ["Edge-Control Plattform", "Safety-Robotik", "Vision-Systeme"])
for pi, (prog, projects) in enumerate(RD_PROGRAMS):
    pid = f"N-OPEX-RD-P{pi+1}"
    add_node(pid, "N-OPEX-RD", prog, sign=-1, disp_inv=True, var_inv=True)
    for ji, proj in enumerate(projects):
        jid = f"{pid}-{ji+1}"
        add_node(jid, pid, proj, sign=-1, disp_inv=True, var_inv=True)
        used = set()
        for ai, nm in enumerate(random.sample(RD_POOL, k=random.choice([4, 5, 6]))):
            nm = uniq_name(nm, used)
            add_leaf(610000 + pi * 1000 + ji * 100 + ai, "", nm, jid,
                     ["Operating expenses", "Research & Development", prog, proj], -1,
                     ("OPEX", "RD"), True, True)

add_node("N-OPEX-GA", "N-OPEX", "General & Administration", sign=-1, disp_inv=True, var_inv=True)
used_ga = set()
for ai, nm in enumerate(GA_POOL):  # bewusst FLACH: Tiefe 3
    nm = uniq_name(nm, used_ga)
    add_leaf(620000 + ai, "", nm, "N-OPEX-GA",
             ["Operating expenses", "General & Administration"], -1, ("OPEX", "GA"), True, True)

add_node("N-OPEX-IT", "N-OPEX", "IT & Digitalisierung", sign=-1, disp_inv=True, var_inv=True)
for gi, grp in enumerate(["Run (Betrieb)", "Change (Projekte)"]):
    gid = f"N-OPEX-IT-{gi+1}"
    add_node(gid, "N-OPEX-IT", grp, sign=-1, disp_inv=True, var_inv=True)
    used = set()
    for ai, nm in enumerate(random.sample(IT_POOL, k=6)):
        nm = uniq_name(nm, used)
        cm = ("Cloud-Kosten +18 % vs. Plan: ungeplante GPU-Kapazität für "
              "KI-Diagnostik-Rollout." if nm == "Cloud-Infrastruktur" and gi == 0 else "")
        add_leaf(630000 + gi * 100 + ai, "", nm, gid,
                 ["Operating expenses", "IT & Digitalisierung", grp], -1, ("OPEX", "IT"), True, True,
                 comment=cm)

# --- Block 4: Other operating result (gemischte Vorzeichen!) --------------------
add_node("N-OOR", None, "Other operating result")
add_node("N-OOR-INC", "N-OOR", "Sonstige betriebliche Erträge")
add_node("N-OOR-EXP", "N-OOR", "Sonstige betriebliche Aufwendungen", sign=-1, disp_inv=True, var_inv=True)
for ai, nm in enumerate(OOR_INC_POOL):
    add_leaf(440000 + ai, "", nm, "N-OOR-INC",
             ["Other operating result", "Sonstige betriebliche Erträge"], 1, ("OOR", "inc"), False, False)
for ai, nm in enumerate(OOR_EXP_POOL):
    add_leaf(660000 + ai, "", nm, "N-OOR-EXP",
             ["Other operating result", "Sonstige betriebliche Aufwendungen"], -1, ("OOR", "exp"),
             True, True)

# --- Block 5: D&A ---------------------------------------------------------------
add_node("N-DA", None, "Depreciation & amortization", sign=-1, disp_inv=True, var_inv=True)
for gi, (grp, pool) in enumerate(DA_POOLS.items()):
    gid = f"N-DA-{gi+1}"
    add_node(gid, "N-DA", grp, sign=-1, disp_inv=True, var_inv=True)
    for ai, nm in enumerate(pool):
        add_leaf(650000 + gi * 100 + ai, "", nm, gid,
                 ["Depreciation & amortization", grp], -1, ("DA", "all"), True, True)

# --- Block 6: Financial result (flachster Block: Tiefe 2) ------------------------
add_node("N-FIN", None, "Financial result")
for nm, no, s, sub in FIN_ACCOUNTS:
    cm = ("USD/BRL-Absicherung ausgelaufen; FX-Verlust 1,9 mEUR über Plan."
          if nm == "FX-Verluste Finanzierung" else "")
    add_leaf(no, "", nm, "N-FIN", ["Financial result"], s, ("FIN", sub), s < 0, s < 0, comment=cm)

# --- Block 7: Income taxes --------------------------------------------------------
add_node("N-TAX", None, "Income taxes", sign=-1, disp_inv=True, var_inv=True)
for nm, no, s in TAX_ACCOUNTS:
    add_leaf(no, "", nm, "N-TAX", ["Income taxes"], -1, ("TAX", "all"), True, True)

# --- Orphans (Datenqualitäts-Signal, nur PC-Modus sichtbar) -----------------------
ORPHANS = []
for i, nm in enumerate(["Konsolidierung IC-Umsatz", "Konsolidierung IC-Marge", "Verrechnung Shared Services"]):
    ORPHANS.append({"AccountID": f"89900{i+1}-9999", "ParentAccountID": "N-CONS-ELIM",
                    "Name": nm, "RowType": "Account", "FormulaDef": "", "SignConvention": -1 if i < 2 else 1,
                    "DisplayInvert": False, "VarianceInvert": False, "Kommentar": "",
                    "_levels": [""] * 6, "_kind": "orphan", "_children": [],
                    "_cat": ("OOR", "exp"), "_w": 0.4, "_dormant": False, "_midyear": False})

# ----------------------------------------------------------------------------
# Auffüllen auf exakt 5.000 Dim-Zeilen
# ----------------------------------------------------------------------------
def count_rows():
    return len(nodes_by_id) + len(leaves) + len(SPECIALS) + len(ORPHANS)

FILLER_TARGETS = [  # (Parent-Auswahl-Funktion, Namenspool, Kontonr-Basis, cat-fn, Gewicht)
    ("MAT", MATERIAL_POOL, 505000),
    ("FER", FERTIGUNG_POOL, 515000),
    ("SM", SM_POOL, 605000),
    ("RD", RD_POOL, 615000),
    ("REV", None, 406000),
]
mat_parents = [n for nid, n in nodes_by_id.items() if nid.startswith("N-COGS-MAT-") and nid.count("-") == 3]
fer_parents = [n for nid, n in nodes_by_id.items() if nid.startswith("N-COGS-FER-") and nid.count("-") == 3]
sm_parents = [n for nid, n in nodes_by_id.items() if nid.startswith("N-OPEX-SM-") and "-C" in nid]
rd_parents = [n for nid, n in nodes_by_id.items() if nid.startswith("N-OPEX-RD-P") and nid.count("-") == 4]
rev_parents = [n for nid, n in nodes_by_id.items() if nid.startswith("N-REV-") and "-P" in nid]

def node_path(n):
    """Levels-Pfad eines Knotens rekonstruieren (Kette der Namen bis zum Blockwurzel)."""
    chain = []
    cur = n
    while cur is not None:
        chain.append(cur["Name"])
        pid = cur["ParentAccountID"]
        cur = nodes_by_id.get(pid) if pid else None
    return list(reversed(chain))

fill_cycle = [(mat_parents, MATERIAL_POOL, 505000, ("COGS", "Material"), 3),
              (fer_parents, FERTIGUNG_POOL, 515000, ("COGS", "Fertigung"), 2),
              (sm_parents, SM_POOL, 605000, ("OPEX", "SM"), 2),
              (rd_parents, RD_POOL, 615000, ("OPEX", "RD"), 2),
              (rev_parents, ["Sonstige Erlöse", "Erlöse Zubehör", "Erlöse Retrofit",
                             "Erlöse Inbetriebnahme", "Erlöse Fernwartung", "Erlöse Garantieverlängerung",
                             "Mieterlöse Equipment", "Erlöse Kalibrierservice"], 406000, ("REV+", None), 4)]
used_names_per_parent = {}
fi = 0
filler_no = 0   # globaler Zähler -> garantiert eindeutige Kontonummern
while count_rows() < TOTAL_DIM_ROWS:
    assert filler_no < 200000
    parents, pool, base_no, cat, weight = fill_cycle[fi % len(fill_cycle)]
    for _ in range(weight):
        if count_rows() >= TOTAL_DIM_ROWS:
            break
        filler_no += 1
        p = random.choice(parents)
        used = used_names_per_parent.setdefault(p["AccountID"], set())
        for c in p["_children"]:
            used.add(c["Name"])
        nm = uniq_name(random.choice(pool), used)
        path = node_path(p)
        seg = None
        if cat[1] is None:  # REV-Filler: Segment aus Pfad ableiten
            segname = path[1]
            seg = {v: k for k, v in SEGMENTS.items()}[segname]
        eff_cat = (cat[0], seg or cat[1])
        is_cost = cat[0] in ("COGS", "OPEX")
        code_part = p["AccountID"].split("-")[-1]
        aid_code = code_part if code_part.isdigit() else ""
        lf = add_leaf(800000 + filler_no, aid_code or f"F{filler_no%97:02d}", nm,
                      p["AccountID"], path,
                      -1 if is_cost else 1, eff_cat, is_cost, is_cost,
                      midyear=(aid_code == MIDYEAR_ENTITY))
        lf["_w"] *= 0.35  # Filler-Konten klein halten
    fi += 1

# ~2,5 % ruhende Konten (alles 0) für den Hide-zero-Test
dormant_candidates = [l for l in leaves if not l["_midyear"] and not l["Kommentar"]]
for l in random.sample(dormant_candidates, k=int(len(leaves) * 0.025)):
    l["_dormant"] = True

assert count_rows() == TOTAL_DIM_ROWS, count_rows()

# ----------------------------------------------------------------------------
# Wertegenerierung
# ----------------------------------------------------------------------------
# Gewichte je Kategorie normieren -> Plan-Monatsbasis je Leaf
cat_sum = {}
for l in leaves:
    if l["_dormant"]:
        continue
    cat_sum[l["_cat"]] = cat_sum.get(l["_cat"], 0.0) + l["_w"]

for l in leaves + ORPHANS:
    if l.get("_dormant"):
        l["_plan_base"] = 0.0
        continue
    tgt, growth, perf = CAT[l["_cat"]]
    share = l["_w"] / cat_sum[l["_cat"]] if l["_cat"] in cat_sum else 0.001
    l["_plan_base"] = tgt * M * share          # Monatsdurchschnitt Plan (Magnitude)
    l["_growth"] = growth
    l["_perf"] = perf * random.uniform(0.93, 1.07)   # Konten streuen um Kategorie-Perf

for o in ORPHANS:  # Orphans: kleine Beträge, eigenes Budget (~0,6 mEUR/Monat)
    o["_plan_base"] = 0.6 * M * o["_w"]
    o["_growth"], o["_perf"] = 0.03, 1.0

def gen_values(l):
    """liefert (AC[6], PY[6], PL[6], FC_FY, PL_FY) — Magnituden (Vorzeichen macht SignConvention)."""
    if l.get("_dormant"):
        z = [0.0] * 6
        return z, z, z, 0.0, 0.0
    pb, g, perf = l["_plan_base"], l["_growth"], l["_perf"]
    PL = [pb * s for s in SEASON_H1]
    PL_H2 = [pb * s for s in SEASON_H2]
    PY = [v / (1.0 + g) * random.uniform(0.97, 1.03) for v in PL]
    AC = [v * perf * random.uniform(0.94, 1.06) for v in PL]
    if l.get("_midyear"):
        # ab April konsolidiert: Jan–Mrz keine Werte, PY komplett leer
        PL = [None, None, None] + PL[3:]
        AC = [None, None, None] + AC[3:]
        PY = [None] * 6
    ytd_ac = sum(v for v in AC if v is not None)
    pl_rest = sum(PL_H2)
    recent = [(a, p) for a, p in zip(AC[3:], PL[3:]) if a is not None and p]
    trend = (sum(a for a, _ in recent) / sum(p for _, p in recent)) if recent else 1.0
    fc_fy = ytd_ac + pl_rest * trend
    pl_fy = sum(v for v in PL if v is not None) + pl_rest
    return AC, PY, PL, fc_fy, pl_fy

for l in leaves + ORPHANS:
    l["_AC"], l["_PY"], l["_PL"], l["_FCFY"], l["_PLFY"] = gen_values(l)

# ----------------------------------------------------------------------------
# Anzeige-Reihenfolge (DFS) + SortOrder
# ----------------------------------------------------------------------------
TOP_ORDER = ["N-REV", "N-COGS", "F-GP", "K-GM", "SEP-1",
             "N-OPEX", "N-OOR", "F-EBITDA", "K-EBITDA", "SEP-2",
             "N-DA", "F-EBIT", "N-FIN", "F-EBT", "N-TAX", "F-NI", "K-NM"]

ordered = []
def dfs(item):
    ordered.append(item)
    for c in item["_children"]:
        dfs(c)

for tid in TOP_ORDER:
    dfs(nodes_by_id[tid] if tid in nodes_by_id else SPECIALS[tid])
ordered.extend(ORPHANS)

# SortOrder = 6 x Position: identische Skala wie der DataView-Zeilenindex
# (6 Monatszeilen je Konto). Nötig, weil das Visual synthetische Levels-
# Zwischensummen nach DataView-Index sortiert, explizite Zeilen nach SortOrder.
for i, r in enumerate(ordered):
    r["SortOrder"] = i * 6

# ----------------------------------------------------------------------------
# Simulation der Visual-Logik -> Abnahmewerte
# ----------------------------------------------------------------------------
def signed_totals(pred=None):
    t = {"ac": 0.0, "py": 0.0, "pl": 0.0, "fcfy": 0.0, "plfy": 0.0}
    for l in leaves:
        if pred and not pred(l):
            continue
        s = l["SignConvention"]
        t["ac"] += s * sum(v for v in l["_AC"] if v is not None)
        t["py"] += s * sum(v for v in l["_PY"] if v is not None)
        t["pl"] += s * sum(v for v in l["_PL"] if v is not None)
        t["fcfy"] += s * l["_FCFY"]
        t["plfy"] += s * l["_PLFY"]
    return t

def block(prefix):
    return signed_totals(lambda l: l["ParentAccountID"].startswith(prefix)
                         or any(str(nid).startswith(prefix) for nid in [l["ParentAccountID"]]))

def by_l1(l1):
    return signed_totals(lambda l: l["_levels"][0] == l1)

REV = by_l1("Net revenue"); COGS = by_l1("Cost of goods sold")
OPEX = by_l1("Operating expenses"); OOR = by_l1("Other operating result")
DA = by_l1("Depreciation & amortization"); FIN = by_l1("Financial result")
TAX = by_l1("Income taxes")

def add(*ds):
    return {k: sum(d[k] for d in ds) for k in ds[0]}

GP = add(REV, COGS); EBITDA = add(GP, OPEX, OOR); EBIT = add(EBITDA, DA)
EBT = add(EBIT, FIN); NI = add(EBT, TAX)

def fmt(d, name):
    return (f"{name:28s} AC {d['ac']/M:9.1f}  PY {d['py']/M:9.1f}  PL {d['pl']/M:9.1f}"
            f"  FC_FY {d['fcfy']/M:9.1f}  PL_FY {d['plfy']/M:9.1f}")

recon_lines = [fmt(REV, "Net revenue"), fmt(COGS, "Cost of goods sold"), fmt(GP, "Gross profit"),
               fmt(OPEX, "Operating expenses"), fmt(OOR, "Other operating result"),
               fmt(EBITDA, "EBITDA"), fmt(DA, "Depreciation & amortization"), fmt(EBIT, "EBIT"),
               fmt(FIN, "Financial result"), fmt(EBT, "EBT"), fmt(TAX, "Income taxes"), fmt(NI, "Net income"),
               f"{'Gross margin %':28s} AC {GP['ac']/REV['ac']*100:6.1f} %   PL {GP['pl']/REV['pl']*100:6.1f} %",
               f"{'EBITDA margin %':28s} AC {EBITDA['ac']/REV['ac']*100:6.1f} %   PL {EBITDA['pl']/REV['pl']*100:6.1f} %",
               f"{'Net margin %':28s} AC {NI['ac']/REV['ac']*100:6.1f} %   PL {NI['pl']/REV['pl']*100:6.1f} %"]

# ----------------------------------------------------------------------------
# Validierung
# ----------------------------------------------------------------------------
ids = [r["AccountID"] for r in ordered]
assert len(ids) == len(set(ids)), "AccountIDs nicht eindeutig!"
ref_names = ["Net revenue", "Cost of goods sold", "Gross profit", "Operating expenses",
             "Other operating result", "EBITDA", "Depreciation & amortization", "EBIT",
             "Financial result", "EBT", "Income taxes", "Net income"]
name_counts = {}
for r in ordered:
    name_counts[r["Name"]] = name_counts.get(r["Name"], 0) + 1
for rn in ref_names:
    assert name_counts.get(rn, 0) == 1, f"Referenzname nicht eindeutig: {rn} ({name_counts.get(rn)})"
for r in ordered:
    lv = [x for x in r["_levels"]]
    for a, b in zip(lv, lv[1:]):
        if a and b:
            assert a != b, f"Level-Wiederholung in {r['AccountID']}: {lv}"
        assert "¦" not in (a or ""), "Trennzeichen ¦ in Levelnamen verboten"
    trimmed = [x for x in lv if x]
    assert lv[:len(trimmed)] == trimmed, f"Levels mit Lücke in {r['AccountID']}: {lv}"

depths = {}
for l in leaves:
    d = len([x for x in l["_levels"] if x])
    depths[d] = depths.get(d, 0) + 1

# ----------------------------------------------------------------------------
# CSV schreiben
# ----------------------------------------------------------------------------
def b(x):
    return "true" if x else "false"

dim_path = os.path.join(OUT, "dim-konten.csv")
with open(dim_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["AccountID", "ParentAccountID", "Name", "L1", "L2", "L3", "L4", "L5", "L6",
                "SortOrder", "RowType", "FormulaDef", "SignConvention",
                "DisplayInvert", "VarianceInvert", "Kommentar"])
    for r in ordered:
        w.writerow([r["AccountID"], r["ParentAccountID"], r["Name"], *r["_levels"],
                    r["SortOrder"], r["RowType"], r["FormulaDef"], r["SignConvention"],
                    b(r["DisplayInvert"]), b(r["VarianceInvert"]), r["Kommentar"]])

def cell(v):
    return "" if v is None else str(int(round(v)))

fact_path = os.path.join(OUT, "fact-guv.csv")
n_fact = 0
with open(fact_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["AccountID", "Monat", "AC", "PY", "PL", "FC_FY", "PL_FY"])
    for r in ordered:
        if r["_kind"] in ("leaf", "orphan"):
            for mi, mo in enumerate(MONTHS):
                w.writerow([r["AccountID"], mo, cell(r["_AC"][mi]), cell(r["_PY"][mi]),
                            cell(r["_PL"][mi]), cell(r["_FCFY"]), cell(r["_PLFY"])])
                n_fact += 1
        else:
            for mo in MONTHS:
                w.writerow([r["AccountID"], mo, 0, 0, 0, 0, 0])
                n_fact += 1

# ----------------------------------------------------------------------------
# Report
# ----------------------------------------------------------------------------
n_nodes = len(nodes_by_id)
n_dormant = sum(1 for l in leaves if l["_dormant"])
print(f"Dim-Zeilen gesamt : {len(ordered)}  (Soll {TOTAL_DIM_ROWS})")
print(f"  Leaves          : {len(leaves)}  (davon ruhend/0: {n_dormant}, "
      f"Midyear: {sum(1 for l in leaves if l['_midyear'])})")
print(f"  PC-Knoten       : {n_nodes}")
print(f"  Formel/KPI/Sep  : {len(SPECIALS)}   Orphans: {len(ORPHANS)}")
print(f"Fakt-Zeilen       : {n_fact}  (Soll {TOTAL_DIM_ROWS * 6})")
print(f"Leaf-Tiefen (Levels-Modus): {dict(sorted(depths.items()))}")
print()
print("=== Abnahmewerte YTD Jan-Jun 2026 (mEUR) ===")
for ln in recon_lines:
    print(ln)

with open(os.path.join(OUT, "reconciliation.txt"), "w", encoding="utf-8") as f:
    f.write("Abnahmewerte YTD Jan-Jun 2026 (mEUR), alle Monate ohne Filter\n")
    f.write("\n".join(recon_lines) + "\n")
