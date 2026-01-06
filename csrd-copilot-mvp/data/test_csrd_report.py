from fpdf import FPDF

# Create PDF
pdf = FPDF()
pdf.add_page()

# Title
pdf.set_font("Helvetica", "B", 20)
pdf.cell(0, 15, "CSRD Sustainability Report 2024", ln=True, align="C")
pdf.ln(10)

# Company Info
pdf.set_font("Helvetica", "B", 14)
pdf.cell(0, 10, "Acme Corporation - ESG Performance Summary", ln=True)
pdf.ln(5)

# Climate Section (E1)
pdf.set_font("Helvetica", "B", 12)
pdf.set_fill_color(200, 220, 255)
pdf.cell(0, 8, "E1 - Climate Change", ln=True, fill=True)
pdf.ln(3)

pdf.set_font("Helvetica", "", 11)
content_e1 = """
Greenhouse Gas Emissions (2024):
- Scope 1 emissions: 12,450 tCO2e (direct emissions from owned sources)
- Scope 2 emissions: 8,320 tCO2e (indirect emissions from purchased energy)
- Scope 3 emissions: 45,200 tCO2e (value chain emissions)
- Total GHG emissions: 65,970 tCO2e

Carbon Intensity: 125 tCO2e per million EUR revenue

Energy Consumption:
- Total energy consumption: 185,000 MWh
- Renewable energy share: 42%
- Energy intensity: 35 MWh per million EUR revenue

Climate Targets:
- 2030 target: Reduce Scope 1+2 emissions by 50% vs 2019 baseline
- 2050 target: Net zero across all scopes
- Carbon pricing applied: 85 EUR per tCO2e (internal carbon price)
"""
pdf.multi_cell(0, 6, content_e1)
pdf.ln(5)

# Social Section (S1)
pdf.set_font("Helvetica", "B", 12)
pdf.set_fill_color(255, 220, 200)
pdf.cell(0, 8, "S1 - Own Workforce", ln=True, fill=True)
pdf.ln(3)

pdf.set_font("Helvetica", "", 11)
content_s1 = """
Workforce Overview (2024):
- Total employees: 5,420 FTE
- Female employees: 2,385 (44%)
- Employees with disabilities: 165 (3%)

Training & Development:
- Training hours per employee: 28 hours
- Training investment: 1,250 EUR per employee

Health & Safety:
- Work-related injuries: 12 incidents
- Lost time injury frequency rate (LTIFR): 2.8 per million hours worked
- Fatalities: 0

Remuneration:
- Gender pay gap: 8.5%
- CEO to median worker pay ratio: 45:1
"""
pdf.multi_cell(0, 6, content_s1)
pdf.ln(5)

# Governance Section (G1)
pdf.set_font("Helvetica", "B", 12)
pdf.set_fill_color(220, 255, 220)
pdf.cell(0, 8, "G1 - Business Conduct", ln=True, fill=True)
pdf.ln(3)

pdf.set_font("Helvetica", "", 11)
content_g1 = """
Anti-Corruption & Ethics (2024):
- Confirmed corruption incidents: 0
- Employees trained on anti-corruption: 98%
- Whistleblower reports received: 23
- Whistleblower reports resolved: 21

Supplier Management:
- Suppliers assessed for ESG criteria: 85%
- Suppliers with code of conduct signed: 92%

Political Engagement:
- Political contributions: 0 EUR
- Lobbying expenditures: 125,000 EUR
"""
pdf.multi_cell(0, 6, content_g1)

# Footer
pdf.ln(10)
pdf.set_font("Helvetica", "I", 9)
pdf.cell(0, 10, "Report prepared in accordance with ESRS standards - Page 1", align="C")

# Save
pdf.output("d:/google/csrd-copilot-mvp/data/test_csrd_report.pdf")
print("PDF created: d:/google/csrd-copilot-mvp/data/test_csrd_report.pdf")
