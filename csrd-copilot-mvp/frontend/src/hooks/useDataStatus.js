import { useState, useEffect } from 'react';

// Hook pour vérifier l'état des données dans l'application
export const useDataStatus = () => {
    const [hasImportedData, setHasImportedData] = useState(false);
    const [hasDataPoints, setHasDataPoints] = useState(false);
    const [lastImportDate, setLastImportDate] = useState(null);

    useEffect(() => {
        // Vérifier dans localStorage si des données ont été importées
        const importData = localStorage.getItem('ecoply_data_imported');
        const dataPointsData = localStorage.getItem('ecoply_data_points');
        const lastImport = localStorage.getItem('ecoply_last_import_date');

        if (importData === 'true') {
            setHasImportedData(true);
        }

        if (dataPointsData) {
            try {
                const points = JSON.parse(dataPointsData);
                setHasDataPoints(points && points.length > 0);
            } catch (e) {
                setHasDataPoints(false);
            }
        }

        if (lastImport) {
            setLastImportDate(new Date(lastImport));
        }
    }, []);

    const markDataImported = () => {
        localStorage.setItem('ecoply_data_imported', 'true');
        localStorage.setItem('ecoply_last_import_date', new Date().toISOString());
        setHasImportedData(true);
        setLastImportDate(new Date());
    };

    const updateDataPoints = (points) => {
        localStorage.setItem('ecoply_data_points', JSON.stringify(points));
        setHasDataPoints(points && points.length > 0);
    };

    const clearDataStatus = () => {
        localStorage.removeItem('ecoply_data_imported');
        localStorage.removeItem('ecoply_data_points');
        localStorage.removeItem('ecoply_last_import_date');
        setHasImportedData(false);
        setHasDataPoints(false);
        setLastImportDate(null);
    };

    return {
        hasImportedData,
        hasDataPoints,
        lastImportDate,
        markDataImported,
        updateDataPoints,
        clearDataStatus
    };
};
