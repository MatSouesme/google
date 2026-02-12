import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Zap, Factory, Truck, Building2, Droplets, Flame, Search, Keyboard, Eye, ArrowRight } from 'lucide-react';

/**
 * Page de calcul des émissions avec facteurs d'émission
 * Permet de sélectionner une donnée source et une catégorie pour calculer les émissions GES
 */
const EmissionFactorsPage = () => {
    const { t } = useTranslation();
    const [sourceData, setSourceData] = useState('');
    const [sourceValue, setSourceValue] = useState('');
    const [category, setCategory] = useState('');
    const [emissionFactor, setEmissionFactor] = useState(null);
    const [calculatedEmissions, setCalculatedEmissions] = useState(null);

    // Data Sources
    const dataSources = [
        { id: 'electricity_kwh', label: t('emissionFactors.sources.electricity_kwh'), unit: 'kWh', icon: Zap },
        { id: 'gas_m3', label: t('emissionFactors.sources.gas_m3'), unit: 'm³', icon: Flame },
        { id: 'fuel_liters', label: t('emissionFactors.sources.fuel_liters'), unit: 'L', icon: Droplets },
        { id: 'distance_km', label: t('emissionFactors.sources.distance_km'), unit: 'km', icon: Truck },
        { id: 'surface_m2', label: t('emissionFactors.sources.surface_m2'), unit: 'm²', icon: Building2 },
        { id: 'production_units', label: t('emissionFactors.sources.production_units'), unit: 'unités', icon: Factory }
    ];

    // Emission Categories
    const emissionCategories = {
        electricity_kwh: [
            { id: 'elec_france', label: t('emissionFactors.categories.elec_france'), factor: 0.0571, unit: 'kgCO2e/kWh' },
            { id: 'elec_europe', label: t('emissionFactors.categories.elec_europe'), factor: 0.296, unit: 'kgCO2e/kWh' },
            { id: 'elec_renewable', label: t('emissionFactors.categories.elec_renewable'), factor: 0.00, unit: 'kgCO2e/kWh' },
            { id: 'elec_coal', label: t('emissionFactors.categories.elec_coal'), factor: 1.06, unit: 'kgCO2e/kWh' }
        ],
        gas_m3: [
            { id: 'gas_natural', label: t('emissionFactors.categories.gas_natural'), factor: 2.27, unit: 'kgCO2e/m³' },
            { id: 'gas_propane', label: t('emissionFactors.categories.gas_propane'), factor: 1.54, unit: 'kgCO2e/kg' }, // Modified unit for propane standard
            { id: 'gas_butane', label: t('emissionFactors.categories.gas_butane'), factor: 2.96, unit: 'kgCO2e/kg' }
        ],
        fuel_liters: [
            { id: 'fuel_diesel', label: t('emissionFactors.categories.fuel_diesel'), factor: 2.68, unit: 'kgCO2e/L' },
            { id: 'fuel_gasoline', label: t('emissionFactors.categories.fuel_gasoline'), factor: 2.28, unit: 'kgCO2e/L' },
            { id: 'fuel_bioethanol', label: t('emissionFactors.categories.fuel_bioethanol'), factor: 1.11, unit: 'kgCO2e/L' },
            { id: 'fuel_kerosene', label: t('emissionFactors.categories.fuel_kerosene'), factor: 2.54, unit: 'kgCO2e/L' }
        ],
        distance_km: [
            { id: 'car_petrol', label: t('emissionFactors.categories.car_petrol'), factor: 0.192, unit: 'kgCO2e/km' },
            { id: 'car_diesel', label: t('emissionFactors.categories.car_diesel'), factor: 0.171, unit: 'kgCO2e/km' },
            { id: 'car_electric', label: t('emissionFactors.categories.car_electric'), factor: 0.053, unit: 'kgCO2e/km' },
            { id: 'truck_heavy', label: t('emissionFactors.categories.truck_heavy'), factor: 0.88, unit: 'kgCO2e/km' },
            { id: 'plane_short', label: t('emissionFactors.categories.plane_short'), factor: 0.258, unit: 'kgCO2e/km' },
            { id: 'plane_long', label: t('emissionFactors.categories.plane_long'), factor: 0.151, unit: 'kgCO2e/km' },
            { id: 'train', label: t('emissionFactors.categories.train'), factor: 0.036, unit: 'kgCO2e/km' }
        ],
        surface_m2: [
            { id: 'building_office', label: t('emissionFactors.categories.building_office'), factor: 20, unit: 'kgCO2e/m²/an' },
            { id: 'building_residential', label: t('emissionFactors.categories.building_residential'), factor: 30, unit: 'kgCO2e/m²/an' },
            { id: 'building_industrial', label: t('emissionFactors.categories.building_industrial'), factor: 15, unit: 'kgCO2e/m²/an' }
        ],
        production_units: [
            { id: 'prod_steel', label: t('emissionFactors.categories.prod_steel'), factor: 1.85, unit: 'kgCO2e/kg' },
            { id: 'prod_cement', label: t('emissionFactors.categories.prod_cement'), factor: 0.65, unit: 'kgCO2e/kg' },
            { id: 'prod_plastic', label: t('emissionFactors.categories.prod_plastic'), factor: 2.4, unit: 'kgCO2e/kg' },
            { id: 'prod_paper', label: t('emissionFactors.categories.prod_paper'), factor: 0.92, unit: 'kgCO2e/kg' }
        ]
    };

    // Calculate emissions when data changes
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
                    <Calculator size={32} color="#10b981" />
                    {t('emissionFactors.title')}
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    {t('emissionFactors.subtitle')}
                </p>
            </div>

            {/* Quick Guide - Redesigned */}
            {!sourceData && (
                <div style={{
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Search size={20} color="var(--primary-color)" />
                        {t('emissionFactors.guide.title')}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { icon: Search, title: t('emissionFactors.guide.step1'), step: 1 },
                            { icon: Keyboard, title: t('emissionFactors.guide.step2'), step: 2 },
                            { icon: Factory, title: t('emissionFactors.guide.step3'), step: 3 },
                            { icon: Eye, title: t('emissionFactors.guide.step4'), step: 4 }
                        ].map((item, idx) => (
                            <div key={idx} style={{ position: 'relative', paddingLeft: '1rem' }}>
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    bottom: 0,
                                    width: '2px',
                                    backgroundColor: idx < 3 ? 'var(--border-color)' : 'transparent'
                                }}></div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    marginBottom: '0.5rem'
                                }}>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        zIndex: 1
                                    }}>
                                        {item.step}
                                    </div>
                                    <item.icon size={18} color="var(--text-secondary)" />
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: '500' }}>
                                    {item.title}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                <strong style={{ color: '#3b82f6' }}>{t('emissionFactors.betaWarning')}</strong>
            </div>

            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                {/* Left Column - Selection */}
                <div>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                            {t('emissionFactors.step1.title')}
                        </h2>

                        {/* Data Source Selection */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '500',
                                fontSize: '0.9rem',
                                color: 'var(--text-primary)'
                            }}>
                                {t('emissionFactors.step1.sourceType')}
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
                                    backgroundColor: 'var(--bg-color)',
                                    color: 'var(--text-color)',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">{t('emissionFactors.step1.placeholderSource')}</option>
                                {dataSources.map(source => (
                                    <option key={source.id} value={source.id}>
                                        {source.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Value Input */}
                        {sourceData && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '500',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-color)'
                                }}>
                                    {t('emissionFactors.step1.quantity')} ({selectedSource?.unit})
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
                                        placeholder={t('emissionFactors.step1.placeholderValue')}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.75rem 0.75rem 3rem',
                                            fontSize: '0.95rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-color)'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Category Selection */}
                        {sourceData && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '500',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-color)'
                                }}>
                                    {t('emissionFactors.step1.category')}
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
                                        backgroundColor: 'var(--bg-color)',
                                        color: 'var(--text-color)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">{t('emissionFactors.step1.placeholderCategory')}</option>
                                    {availableCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Selected Emission Factor */}
                        {emissionFactor && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                    {t('emissionFactors.step1.emissionFactor')}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                                    {emissionFactor.factor} {emissionFactor.unit}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Results */}
                <div>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                            {t('emissionFactors.step2.title')}
                        </h2>

                        {calculatedEmissions !== null ? (
                            <>
                                {/* Main Result */}
                                <div style={{
                                    padding: '2rem',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    marginBottom: '1.5rem',
                                    border: '2px solid rgba(16, 185, 129, 0.3)'
                                }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                        {t('emissionFactors.step2.totalEmissions')}
                                    </div>
                                    <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
                                        {calculatedEmissions.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                                        kgCO₂e
                                    </div>
                                </div>

                                {/* Calculation Details */}
                                <div style={{
                                    padding: '1rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    marginBottom: '1.5rem'
                                }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                                        {t('emissionFactors.step2.detail')}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <strong>{sourceValue} {selectedSource?.unit}</strong> × <strong>{emissionFactor.factor} {emissionFactor.unit}</strong>
                                        </div>
                                        <div>
                                            = <strong style={{ color: '#10b981' }}>{calculatedEmissions.toFixed(2)} kgCO₂e</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Tonnes conversion */}
                                {calculatedEmissions >= 1000 && (
                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '8px',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        {t('emissionFactors.step2.conversion', { tonnes: (calculatedEmissions / 1000).toFixed(2) })}
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
                                <p>{t('emissionFactors.step2.emptyState')}</p>
                            </div>
                        )}
                    </div>


                </div>
            </div>

            {/* Examples Section */}
            <div className="card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                    {t('emissionFactors.examples.title')}
                </h3>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                            {t('emissionFactors.examples.elec')}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            10 000 kWh × 0.0571 kgCO₂e/kWh = 571 kgCO₂e
                        </div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                            {t('emissionFactors.examples.car')}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            15 000 km × 0.192 kgCO₂e/km = 2880 kgCO₂e
                        </div>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                            {t('emissionFactors.examples.heating')}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            2 000 m³ gaz × 2.27 kgCO₂e/m³ = 4540 kgCO₂e
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmissionFactorsPage;
