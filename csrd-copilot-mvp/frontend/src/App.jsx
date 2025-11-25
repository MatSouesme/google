import React, { useState } from 'react'
import './App.css'
import UploadWizard from './components/UploadWizard'

function App() {
    const [count, setCount] = useState(0)

    return (
        <div className="App">
            <h1>Ecoply</h1>
            <div className="card">
                <UploadWizard />
            </div>
        </div>
    )
}

export default App
