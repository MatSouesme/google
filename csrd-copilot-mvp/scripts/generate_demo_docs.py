
from fpdf import FPDF
import os

# Ensure directory exists
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "company_docs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 12)
        self.cell(0, 10, 'CONFIDENTIEL - DOCUMENT INTERNE', 0, 1, 'C')
        self.ln(10)

    def chapter_title(self, title):
        self.set_font('Arial', 'B', 16)
        self.set_fill_color(200, 220, 255)
        self.cell(0, 10, title, 0, 1, 'L', 1)
        self.ln(4)

    def chapter_body(self, body):
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 6, body)
        self.ln()

# 1. Politique Environnementale (ENV300 - Conforme)
pdf_env = PDF()
pdf_env.add_page()
pdf_env.chapter_title("POLITIQUE ENVIRONNEMENTALE & CLIMAT 2024")
pdf_env.chapter_body(
    "1. ENGAGEMENT\n"
    "Notre entreprise s'engage formellement à réduire son impact environnemental. "
    "Cette politique est signée par la direction générale et s'applique à l'ensemble de nos opérations.\n\n"
    "2. OBJECTIFS ÉNERGIE & CLIMAT (ENV300)\n"
    "Conformément aux exigences de l'accord de Paris, nous avons fixé les objectifs suivants :\n"
    "- Objectif Quantitatif : Réduire la consommation énergétique de nos bureaux de 20% d'ici 2030 (année de référence 2020).\n"
    "- Objectif Qualitatif : Transitionner vers 100% d'électricité renouvelable d'ici 2025.\n"
    "- Numérique : Réduire l'empreinte carbone de nos serveurs via l'optimisation du code.\n\n"
    "3. GESTION DES DÉCHETS\n"
    "Nous visons le 'Zéro Déchet' en décharge d'ici 2028."
)
pdf_env.output(os.path.join(OUTPUT_DIR, "Politique_Environnementale_2024.pdf"))


# 2. Bilan GES 2024 (ENV630 - Conforme)
pdf_ges = PDF()
pdf_ges.add_page()
pdf_ges.chapter_title("BILAN DES ÉMISSIONS DE GAZ À EFFET DE SERRE (2024)")
pdf_ges.chapter_body(
    "Période de reporting : 1er Janvier 2024 - 31 Décembre 2024\n"
    "Périmètre : Opérationnel & Financier (95% des activités couvertes)\n\n"
    "RÉSULTATS SYNTHÉTIQUES (tCO2e) :\n\n"
    "SCOPE 1 (Émissions Directes) : 0.00 tCO2e\n"
    "Justification : Entreprise 100% Full Remote, pas de flotte de véhicules, pas de combustion sur site.\n\n"
    "SCOPE 2 (Émissions Indirectes liées à l'énergie) : 0.00 tCO2e\n"
    "Justification : Les consommations électriques des employés en télétravail sont comptabilisées en Scope 3.\n\n"
    "SCOPE 3 (Autres Émissions Indirectes) : 24.00 tCO2e\n"
    "Détail des postes significatifs :\n"
    "- Achats de Services Numériques : 15.00 tCO2e\n"
    "- Déplacements Professionnels : 8.00 tCO2e\n"
    "- Déchets : 1.00 tCO2e\n\n"
    "SCOPE 3 AVAL : 0.01 tCO2e\n"
    "Note : Valeur minimale déclarée pour les besoins du reporting."
)
pdf_ges.output(os.path.join(OUTPUT_DIR, "Bilan_Carbone_2024.pdf"))


# 3. Rapport Social & Diversité (LAB601 - Non Conforme / Partiel)
# On fait exprès de ne mettre AUCUN chiffre précis pour déclencher une suggestion d'amélioration.
pdf_social = PDF()
pdf_social.add_page()
pdf_social.chapter_title("RAPPORT SOCIAL & INCLUSION 2024")
pdf_social.chapter_body(
    "1. VISION\n"
    "Chez nous, la diversité est une force. Nous accueillons des talents de tous horizons, sans distinction de genre, "
    "d'origine ou de religion. Nous nous engageons à offrir un environnement de travail inclusif.\n\n"
    "2. ACTIONS\n"
    "Nous organisons régulièrement des ateliers de sensibilisation aux biais inconscients.\n"
    "Nous avons mis en place une procédure de recrutement anonymisée pour certains postes.\n\n"
    "3. INDICATEURS CLÉS\n"
    "Pour le moment, nous ne collectons pas de statistiques ethniques ou religieuses conformément à la loi locale, "
    "et nous n'avons pas encore mis en place de monitoring quantitatif sur les populations vulnérables ou en situation de handicap.\n"
    "Nous prévoyons de lancer une enquête interne en 2025 pour mieux comprendre la démographie de nos équipes."
)
pdf_social.output(os.path.join(OUTPUT_DIR, "Rapport_Social_2024.pdf"))


print(f"Generated 3 PDFs in {OUTPUT_DIR}")
