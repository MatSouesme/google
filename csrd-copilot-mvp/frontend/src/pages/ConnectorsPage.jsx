import React from 'react';
import Connectors from '../components/Connectors';

const ConnectorsPage = () => {
    return (
        <div className="connectors-page">
            <div className="page-header">
                <h1 className="page-title">Data Connectors</h1>
                <p className="page-subtitle">Connect your data sources to automate data collection.</p>
            </div>

            <div className="card">
                <Connectors />
            </div>
        </div>
    );
};

export default ConnectorsPage;
