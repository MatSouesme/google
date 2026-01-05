import pandas as pd
import os

# Define the data based on the user's request
data = [
    {
        "Metric ID": "E1-8-1",
        "Metric Name": "Carbon pricing scheme by type",
        "Value": "Shadow price",
        "Unit": "N/A",
        "Year": 2024,
        "Description": "Type of internal carbon pricing scheme implemented by the undertaking."
    },
    {
        "Metric ID": "E1-8-2",
        "Metric Name": "Carbon price applied for each metric tonne of greenhouse gas emission",
        "Value": 50,
        "Unit": "EUR",
        "Year": 2024,
        "Description": "The monetary value assigned to each tonne of CO2e emissions."
    },
    {
        "Metric ID": "E1-8-3",
        "Metric Name": "Percentage of gross Scope 1 greenhouse gas emissions covered by internal carbon pricing scheme",
        "Value": 85,
        "Unit": "%",
        "Year": 2024,
        "Description": "Share of Scope 1 emissions subject to the internal carbon price."
    },
    {
        "Metric ID": "E1-8-4",
        "Metric Name": "Percentage of gross Scope 2 greenhouse gas emissions covered by internal carbon pricing scheme",
        "Value": 100,
        "Unit": "%",
        "Year": 2024,
        "Description": "Share of Scope 2 emissions subject to the internal carbon price."
    },
    {
        "Metric ID": "E1-8-5",
        "Metric Name": "Percentage of gross Scope 3 greenhouse gas emissions covered by internal carbon pricing scheme",
        "Value": 30,
        "Unit": "%",
        "Year": 2024,
        "Description": "Share of Scope 3 emissions subject to the internal carbon price."
    }
]

# Create DataFrame
df = pd.DataFrame(data)

# Define output path
output_dir = r'd:\google\csrd-copilot-mvp\data\demo'
output_file = os.path.join(output_dir, 'e1_carbon_pricing.xlsx')

# Ensure directory exists
os.makedirs(output_dir, exist_ok=True)

# Save to Excel
try:
    df.to_excel(output_file, index=False)
    print(f"✅ Successfully created {output_file}")
except Exception as e:
    print(f"❌ Failed to create Excel file: {e}")
