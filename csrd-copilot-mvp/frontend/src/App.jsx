import React, { useState } from 'react'
import './App.css'
import UploadWizard from './components/UploadWizard'
import CopilotInterface from './components/CopilotInterface'

function App() {
    return (
        <div className="App">
            <h1>Ecoply</h1>
            <div className="card">
                <UploadWizard />
            </div>
            <div className="card" style={{ marginTop: '2rem' }}>
                <CopilotInterface />
            </div>
        </div>
    )
}

export default App
