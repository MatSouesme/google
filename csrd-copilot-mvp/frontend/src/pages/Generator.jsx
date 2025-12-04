import React from 'react';
import UploadWizard from '../components/UploadWizard';
import CopilotInterface from '../components/CopilotInterface';

const Generator = () => {
    return (
        <div className="generator-page">
            <div className="page-header">
                <h1 className="page-title">IA Generator</h1>
                <p className="page-subtitle">Upload your documents and generate CSRD reports with AI.</p>
            </div>

            <div className="card">
                <UploadWizard />
            </div>

            <div className="card">
                <CopilotInterface />
            </div>
        </div>
    );
};

export default Generator;
