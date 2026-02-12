import React, { useState, useEffect } from 'react';
import { Calculator, Zap, Factory, Truck, Building2, Droplets, Flame } from 'lucide-react';

/**
 * Page de calcul des émissions avec facteurs d'émission
 * Permet de sélectionner une donnée source et une catégorie pour calculer les émissions GES
 */
const EmissionFactorsPage = () => {
    const [sourceData, setSourceData] = useState('');
    const [sourceValue, setSourceValue] = useState('');
    const [category, setCategory] = useState('');
    const [emissionFactor, setEmissionFactor] = useState(null);
    const [calculatedEmissions, setCalculatedEmissions] = useState(null);

    // Données sources disponibles (à remplacer par des vraies données BigQuery)
    const dataSources = [
        { id: 'electricity_kwh', label: 'Consommation électrique (kWh)', unit: 'kWh', icon: Zap },
        { id: 'gas_m3', label: 'Consommation gaz (m³)', unit: 'm³', icon: Flame },
        { id: 'fuel_liters', label: 'Carburant (litres)', unit: 'L', icon: Droplets },
        { id: 'distance_km', label: 'Distance parcourue (km)', unit: 'km', icon: Truck },
        { id: 'surface_m2', label: 'Surface bâtiment (m²)', unit: 'm²', icon: Building2 },
        { id: 'production_units', label: 'Unités produites', unit: 'unités', icon: Factory }
    ];

    // Catégories de facteurs d'émission (VALEURS FICTIVES - à remplacer)
    const emissionCategories = {
        electricity_kwh: [
            { id: 'elec_france', label: 'Mix électrique France', factor: 5, unit: 'kgCO2e/kWh' },
            { id: 'elec_europe', label: 'Mix électrique Europe', factor: 5, unit: 'kgCO2e/kWh' },
            { id: 'elec_renewable', label: 'Électricité renouvelable', factor: 5, unit: 'kgCO2e/kWh' },
            { id: 'elec_coal', label: 'Électricité charbon', factor: 5, unit: 'kgCO2e/kWh' }
        ],
        gas_m3: [
            { id: 'gas_natural', label: 'Gaz naturel', factor: 5, unit: 'kgCO2e/m³' },
            { id: 'gas_propane', label: 'Propane', factor: 5, unit: 'kgCO2e/m³' },
            { id: 'gas_butane', label: 'Butane', factor: 5, unit: 'kgCO2e/m³' }
        ],
        fuel_liters: [
            { id: 'fuel_diesel', label: 'Diesel', factor: 5, unit: 'kgCO2e/L' },
            { id: 'fuel_gasoline', label: 'Essence', factor: 5, unit: 'kgCO2e/L' },
            { id: 'fuel_bioethanol', label: 'Bioéthanol', factor: 5, unit: 'kgCO2e/L' },
            { id: 'fuel_kerosene', label: 'Kérosène', factor: 5, unit: 'kgCO2e/L' }
        ],
        distance_km: [
            { id: 'car_petrol', label: 'Voiture essence', factor: 5, unit: 'kgCO2e/km' },
            { id: 'car_diesel', label: 'Voiture diesel', factor: 5, unit: 'kgCO2e/km' },
            { id: 'car_electric', label: 'Voiture électrique', factor: 5, unit: 'kgCO2e/km' },
            { id: 'truck_heavy', label: 'Camion lourd', factor: 5, unit: 'kgCO2e/km' },
            { id: 'plane_short', label: 'Avion court-courrier', factor: 5, unit: 'kgCO2e/km' },
            { id: 'plane_long', label: 'Avion long-courrier', factor: 5, unit: 'kgCO2e/km' },
            { id: 'train', label: 'Train', factor: 5, unit: 'kgCO2e/km' }
        ],
        surface_m2: [
            { id: 'building_office', label: 'Bureau', factor: 5, unit: 'kgCO2e/m²/an' },
            { id: 'building_residential', label: 'Résidentiel', factor: 5, unit: 'kgCO2e/m²/an' },
            { id: 'building_industrial', label: 'Industriel', factor: 5, unit: 'kgCO2e/m²/an' }
        ],
        production_units: [
            { id: 'prod_steel', label: 'Acier', factor: 5, unit: 'kgCO2e/tonne' },
            { id: 'prod_cement', label: 'Ciment', factor: 5, unit: 'kgCO2e/tonne' },
            { id: 'prod_plastic', label: 'Plastique', factor: 5, unit: 'kgCO2e/tonne' },
            { id: 'prod_paper', label: 'Papier', factor: 5, unit: 'kgCO2e/tonne' }
        ]
    };

    // Calculer les émissions quand les données changent
    useEffect(() => {
        if (sourceValue && emissionFactor) {
            const value = parseFloat(sourceValue);
            if (!isNaN(value)) {
                const emissions = value * emissionFactor.factor;
                setCalculatedEmissions(emissions);
            } else {
                setCalculatedEmissions(null);
            }
        } else {
            setCalculatedEmissions(null);
        }
    }, [sourceValue, emissionFactor]);

    const handleSourceDataChange = (e) => {
        setSourceData(e.target.value);
        setCategory('');
        setEmissionFactor(null);
        setCalculatedEmissions(null);
    };

    const handleCategoryChange = (e) => {
        const categoryId = e.target.value;
        setCategory(categoryId);
        
        if (sourceData && categoryId) {
            const selectedCategory = emissionCategories[sourceData]?.find(c => c.id === categoryId);
            setEmissionFactor(selectedCategory || null);
        } else {
            setEmissionFactor(null);
        }
    };

    const selectedSource = dataSources.find(ds => ds.id === sourceData);
    const availableCategories = sourceData ? emissionCategories[sourceData] || [] : [];
    const SourceIcon = selectedSource?.icon || Calculator;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ 
                    margin: 0, 
                    fontSize: '2rem', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <Calculator size={32} color="#3b82f6" />
                    Facteurs d'Émissions
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    Calculez vos émissions GES à partir de vos données d'activité
                </p>
            </div>

            {/* Info banner */}
            <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderLeft: '4px solid #3b82f6',
                borderRadius: '6px',
                marginBottom: '2rem',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)'
            }}>
                <strong style={{ color: '#3b82f6' }}>ℹ️ Version bêta</strong> - Les facteurs d'émission affichés sont des valeurs fictives.
                Les valeurs réelles seront intégrées depuis la Base Carbone ADEME prochainement.
            </div>

            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                {/* Colonne gauche - Sélection */}
                <div>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                            1. Sélectionnez vos données
                        </h2>

                        {/* Sélection source de données */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '0.5rem', 
                                fontWeight: '500',
                                fontSize: '0.9rem',
                                color: 'var(--text-primary)'
                            }}>
                                Type de donnée source
                            </label>
                            <select
                                value={sourceData}
                                onChange={handleSourceDataChange}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    fontSize: '0.95rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">-- Choisir un type de donnée --</option>
                                {dataSources.map(source => (
                                    <option key={source.id} value={source.id}>
                                        {source.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Valeur de la donnée */}
                        {sourceData && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '0.5rem', 
                                    fontWeight: '500',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-primary)'
                                }}>
                                    Quantité ({selectedSource?.unit})
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <SourceIcon 
                                        size={20} 
                                        style={{ 
                                            position: 'absolute', 
                                            left: '0.75rem', 
                                            top: '50%', 
                                            transform: 'translateY(-50%)',
                                            color: 'var(--text-secondary)'
                                        }} 
                                    />
                                    <input
                                        type="number"
                                        value={sourceValue}
                                        onChange={(e) => setSourceValue(e.target.value)}
                                        placeholder="Entrez la valeur"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.75rem 0.75rem 3rem',
                                            fontSize: '0.95rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Sélection catégorie */}
                        {sourceData && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '0.5rem', 
                                    fontWeight: '500',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-primary)'
                                }}>
                                    Catégorie d'émission
                                </label>
                                <select
                                    value={category}
                                    onChange={handleCategoryChange}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">-- Choisir une catégorie --</option>
                                    {availableCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Facteur d'émission sélectionné */}
                        {emissionFactor && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                    Facteur d'émission
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                                    {emissionFactor.factor} {emissionFactor.unit}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Colonne droite - Résultats */}
                <div>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                            2. Résultat du calcul
                        </h2>

                        {calculatedEmissions !== null ? (
                            <>
                                {/* Résultat principal */}
                                <div style={{
                                    padding: '2rem',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    marginBottom: '1.5rem',
                                    border: '2px solid rgba(59, 130, 246, 0.3)'
                                }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                        Émissions totales
                                    </div>
                                    <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.5rem' }}>
                                        {calculatedEmissions.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                                        kgCO₂e
                                    </div>
                                </div>

                                {/* Détails du calcul */}
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem'
                                }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                                        📊 Détail du calcul
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <strong>{sourceValue} {selectedSource?.unit}</strong> × <strong>{emissionFactor.factor} {emissionFactor.unit}</strong>
                                        </div>
                                        <div>
                                            = <strong style={{ color: '#3b82f6' }}>{calculatedEmissions.toFixed(2)} kgCO₂e</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Conversion tonnes */}
                                {calculatedEmissions >= 1000 && (
                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        💡 Soit <strong style={{ color: '#f59e0b' }}>{(calculatedEmissions / 1000).toFixed(2)} tonnes CO₂e</strong>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{
                                padding: '3rem 2rem',
                                textAlign: 'center',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '12px'
                            }}>
                                <Calculator size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                <p>Sélectionnez une source de données, entrez une valeur et choisissez une catégorie pour voir le calcul</p>
                            </div>
                        )}
                    </div>

                    {/* Guide rapide */}
                    {!sourceData && (
                        <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                                📖 Guide rapide
                            </h3>
                            <ul style={{ 
                                listStyle: 'none', 
                                padding: 0, 
                                margin: 0,
                                fontSize: '0.9rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.8
                            }}>
                                <li style={{ marginBottom: '0.5rem' }}>
                                    ✓ Choisissez le type de donnée (électricité, carburant, distance...)
                                </li>
                                <li style={{ marginBottom: '0.5rem' }}>
                                    ✓ Entrez la quantité mesurée
                                </li>
                                <li style={{ marginBottom: '0.5rem' }}>
                                    ✓ Sélectionnez la catégorie d'émission appropriée
                                </li>
                                <li>
                                    ✓ Le calcul se fait automatiquement
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Section exemples */}
            <div className="card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                    💡 Exemples d'utilisation
                </h3>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            ⚡ Émissions électriques
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            10 000 kWh × 5 kgCO₂e/kWh = 50 000 kgCO₂e
                        </div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            🚗 Déplacements véhicule
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            15 000 km × 5 kgCO₂e/km = 75 000 kgCO₂e
                        </div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            🏢 Chauffage bâtiment
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            2 000 m³ gaz × 5 kgCO₂e/m³ = 10 000 kgCO₂e
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmissionFactorsPage;
