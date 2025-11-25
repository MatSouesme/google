import os
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = "data/raw"
ESRS_DIR = os.path.join(DATA_DIR, "esrs_texts")
REPORTS_DIR = os.path.join(DATA_DIR, "csrd_reports")

# Example URLs (replace with actual curated links)
ESRS_LINKS = {
    "E1_Climate_Change": "https://www.efrag.org/Assets/Download?assetUrl=%2Fsites%2Fwebpublishing%2FSiteAssets%2F08%2520Draft%2520ESRS%2520E1%2520Climate%2520change%2520November%25202022.pdf", # Placeholder
    "G1_Business_Conduct": "https://www.efrag.org/Assets/Download?assetUrl=%2Fsites%2Fwebpublishing%2FSiteAssets%2F13%2520Draft%2520ESRS%2520G1%2520Business%2520conduct%2520November%25202022.pdf" # Placeholder
}

REPORT_LINKS = {
    "Company_A_Report": "https://example.com/report_a.pdf", # Placeholder
    "Company_B_Report": "https://example.com/report_b.pdf"  # Placeholder
}

def download_file(url, dest_path):
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        logger.info(f"Downloaded: {dest_path}")
    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")

def main():
    os.makedirs(ESRS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    logger.info("Downloading ESRS Texts...")
    for name, url in ESRS_LINKS.items():
        dest_path = os.path.join(ESRS_DIR, f"{name}.pdf")
        if not os.path.exists(dest_path):
             # In a real scenario, we would download. 
             # For this MVP script, we'll just create dummy files if URLs are placeholders
             if "example.com" in url or "efrag.org" in url: 
                 with open(dest_path, "w") as f:
                     f.write(f"Dummy content for {name}")
                 logger.info(f"Created dummy file for {name}")
             else:
                download_file(url, dest_path)
        else:
            logger.info(f"File already exists: {dest_path}")

    logger.info("Downloading CSRD Reports...")
    for name, url in REPORT_LINKS.items():
        dest_path = os.path.join(REPORTS_DIR, f"{name}.pdf")
        if not os.path.exists(dest_path):
            if "example.com" in url:
                 with open(dest_path, "w") as f:
                     f.write(f"Dummy content for {name}")
                 logger.info(f"Created dummy file for {name}")
            else:
                download_file(url, dest_path)
        else:
            logger.info(f"File already exists: {dest_path}")

if __name__ == "__main__":
    main()
