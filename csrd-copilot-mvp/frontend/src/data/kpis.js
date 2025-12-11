export const kpis = [
    // --- Environmental (E1 - Climate Change) ---
    {
        id: 'E1-1',
        name: 'Gross Scope 1 GHG Emissions',
        status: 'missing',
        category: 'Environmental',
        standard: 'ESRS E1',
        description: 'Gross direct GHG emissions in metric tonnes of CO2eq from sources owned or controlled by the undertaking.',
        calculation: 'Activity data (e.g., liters of fuel consumed) × Emission factor (e.g., kg CO2eq/liter). Sum across all direct sources (stationary combustion, mobile combustion, fugitive emissions).',
        unit: 'tCO2e'
    },
    {
        id: 'E1-2',
        name: 'Gross Scope 2 GHG Emissions',
        status: 'missing',
        category: 'Environmental',
        standard: 'ESRS E1',
        description: 'Gross indirect GHG emissions from the generation of purchased electricity, heat, steam, and cooling.',
        calculation: 'Market-based: consumption × supplier-specific factor. Location-based: consumption × grid average factor.',
        unit: 'tCO2e'
    },
    {
        id: 'E1-3',
        name: 'Gross Scope 3 GHG Emissions',
        status: 'missing',
        category: 'Environmental',
        standard: 'ESRS E1',
        description: 'Gross indirect GHG emissions that occur in the value chain (upstream and downstream).',
        calculation: 'Sum of emissions from 15 categories (e.g., purchased goods, business travel, use of sold products) using generic or specific emission factors.',
        unit: 'tCO2e'
    },
    {
        id: 'E1-4',
        name: 'Total Energy Consumption',
        status: 'completed',
        category: 'Environmental',
        standard: 'ESRS E1',
        description: 'Total energy consumption from non-renewable and renewable sources.',
        calculation: 'Sum of all fuel, electricity, heat, steam, and cooling consumption converted to MWh.',
        unit: 'MWh'
    },
    {
        id: 'E1-5',
        name: 'Renewable Energy Share',
        status: 'completed',
        category: 'Environmental',
        standard: 'ESRS E1',
        description: 'Percentage of total energy consumption derived from renewable sources.',
        calculation: '(Renewable energy consumption / Total energy consumption) × 100.',
        unit: '%'
    },
    // --- Environmental (E4 - Biodiversity) ---
    {
        id: 'E4-1',
        name: 'Sites in Sensitive Areas',
        status: 'missing',
        category: 'Environmental',
        standard: 'ESRS E4',
        description: 'Number and area of sites located in or near biodiversity-sensitive areas.',
        calculation: 'Mapping of operational sites against protected area databases (e.g., Natura 2000, IUCN Red List areas).',
        unit: 'Count / Hectares'
    },

    // --- Social (S1 - Own Workforce) ---
    {
        id: 'S1-1',
        name: 'Gender Pay Gap',
        status: 'missing',
        category: 'Social',
        standard: 'ESRS S1',
        description: 'Percentage difference between average gross hourly earnings of male and female employees.',
        calculation: '((Average hourly male pay - Average hourly female pay) / Average hourly male pay) * 100.',
        unit: '%'
    },
    {
        id: 'S1-2',
        name: 'Total Employee Turnover',
        status: 'completed',
        category: 'Social',
        standard: 'ESRS S1',
        description: 'Rate of employee turnover during the reporting period.',
        calculation: '(Number of leavers / Average number of employees) * 100.',
        unit: '%'
    },
    {
        id: 'S1-3',
        name: 'Health & Safety Incidents',
        status: 'missing',
        category: 'Social',
        standard: 'ESRS S1',
        description: 'Number of work-related recordable injuries and fatalities.',
        calculation: 'Count of incidents following national reporting definitions or ILO guidelines.',
        unit: 'Count'
    },
    {
        id: 'S1-4',
        name: 'Training Hours per Employee',
        status: 'completed',
        category: 'Social',
        standard: 'ESRS S1',
        description: 'Average number of training hours per employee, broken down by gender and employee category.',
        calculation: 'Total training hours / Total number of employees.',
        unit: 'Hours/Employee'
    },

    // --- Governance (G1 - Business Conduct) ---
    {
        id: 'G1-1',
        name: 'Board Diversity',
        status: 'completed',
        category: 'Governance',
        standard: 'ESRS G1',
        description: 'Percentage of board members from underrepresented groups (gender, age, background).',
        calculation: '(Number of underrepresented members / Total board members) * 100.',
        unit: '%'
    },
    {
        id: 'G1-2',
        name: 'Anti-corruption Training',
        status: 'missing',
        category: 'Governance',
        standard: 'ESRS G1',
        description: 'Percentage of employees and governance body members who have received anti-corruption training.',
        calculation: '(Number trained / Total headcount) * 100.',
        unit: '%'
    },
    {
        id: 'G1-3',
        name: 'Confirmed Incidents of Corruption',
        status: 'completed',
        category: 'Governance',
        standard: 'ESRS G1',
        description: 'Number of confirmed incidents of corruption or bribery.',
        calculation: 'Count of legally confirmed incidents during the reporting period.',
        unit: 'Count'
    },
    {
        id: 'G1-4',
        name: 'Political Contributions',
        status: 'completed',
        category: 'Governance',
        standard: 'ESRS G1',
        description: 'Total monetary value of financial and in-kind political contributions.',
        calculation: 'Sum of all direct and indirect contributions to political parties or causes.',
        unit: 'EUR'
    }
];
