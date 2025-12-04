from typing import List, Dict, Any, Tuple
import os
# In a real scenario, we would use: from simple_salesforce import Salesforce
from .base import BaseConnector

class SalesforceConnector(BaseConnector):
    def __init__(self, project_id: str, credentials: Dict[str, str]):
        super().__init__(project_id)
        self.username = credentials.get('username')
        self.password = credentials.get('password')
        self.token = credentials.get('token')
        self.client = None

    def authenticate(self) -> bool:
        """
        Simulates authentication with Salesforce.
        In prod: self.client = Salesforce(username=..., password=..., security_token=...)
        """
        print(f"Authenticating to Salesforce as {self.username}...")
        if self.username and self.password:
            self.client = "MockSalesforceClient"
            return True
        return False

    def fetch_data(self, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Simulates fetching data from a 'SustainabilityRecord__c' object.
        Generates random data for multiple facilities and years to avoid duplicates.
        """
        if not self.client:
            raise ConnectionError("Not authenticated")

        print("Fetching data from Salesforce object: SustainabilityRecord__c...")
        
        import random
        import uuid

        facilities = ["Paris HQ", "London Branch", "Berlin Warehouse", "Madrid Office"]
        years = ["2023", "2024", "2025"]
        
        mock_data = []
        
        for facility in facilities:
            for year in years:
                # Generate random values within realistic ranges
                scope1 = round(random.uniform(50, 500), 2)
                scope2 = round(random.uniform(50, 500), 2)
                scope3 = round(random.uniform(100, 1000), 2)
                energy = round(random.uniform(1000, 20000), 2)
                renewable = round(random.uniform(10, 100), 1)
                
                gas = round(random.uniform(5000, 50000), 0)
                water = round(random.uniform(1000, 10000), 0)
                revenue = round(random.uniform(1000000, 10000000), 0)
                employees = random.randint(50, 500)

                record = {
                    "Id": f"a0{random.randint(100,999)}w00000{uuid.uuid4().hex[:5].upper()}",
                    "Year__c": year,
                    "Facility__c": facility,
                    
                    # CSRD E1 Data
                    "Scope1_tCO2__c": scope1,
                    "Scope2_tCO2__c": scope2,
                    "Scope3_tCO2__c": scope3,
                    "Energy_MWh__c": energy,
                    "Renewable_Percent__c": renewable,
                    
                    # Extra Data
                    "Gas_m3__c": gas,
                    "Water_m3__c": water,
                    "Revenue_EUR__c": revenue,
                    "Employees_Count__c": employees
                }
                mock_data.append(record)
                
        return mock_data

    def transform_data(self, raw_data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Maps Salesforce fields to our BigQuery E1 Schema.
        Returns (standard_rows, extra_rows)
        """
        import uuid
        standard_rows = []
        extra_rows = []
        sync_id = str(uuid.uuid4())
        
        for idx, item in enumerate(raw_data):
            # 1. Standard E1 Data (Matches e1_raw schema)
            std_row = {
                "year": item.get("Year__c"),
                "scope1_emissions_tCO2": item.get("Scope1_tCO2__c"),
                "scope2_emissions_tCO2": item.get("Scope2_tCO2__c"),
                "scope3_emissions_tCO2": item.get("Scope3_tCO2__c"),
                "energy_consumption_MWh": item.get("Energy_MWh__c"),
                "renewable_share_pct": item.get("Renewable_Percent__c"),
                
                # Metadata
                "row_number": idx + 1,
                "upload_id": sync_id
            }
            standard_rows.append(std_row)

            # 2. Extra Data (Gas, Water, Sales, etc.)
            # We create a separate record for the extra table
            extra_row = {
                "gas_consumption_m3": item.get("Gas_m3__c"),
                "water_consumption_m3": item.get("Water_m3__c"),
                "revenue_eur": item.get("Revenue_EUR__c"),
                "employees_count": item.get("Employees_Count__c"),
                "facility_name": item.get("Facility__c"),
                
                # Link keys to join with standard data if needed
                "row_number": idx + 1,
                "upload_id": sync_id,
                "original_salesforce_id": item.get("Id")
            }
            extra_rows.append(extra_row)
        
        # Add standard metadata (ingestion timestamp, source)
        standard_rows = self.add_metadata(standard_rows, "SALESFORCE")
        extra_rows = self.add_metadata(extra_rows, "SALESFORCE_EXTRA")
        
        return standard_rows, extra_rows
