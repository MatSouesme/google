import React, { useState } from 'react';
import './ConflictResolutionModal.css';

/**
 * ConflictResolutionModal - Displays conflicts between new and existing data
 * Allows users to decide: Add New, Replace Existing, or Skip for each conflict
 */
const ConflictResolutionModal = ({ conflicts, noConflicts, onResolve, onCancel }) => {
  // State: resolution decisions for each conflict
  // Key = `${kpi_id}_${date}`, Value = { action: 'add'|'replace'|'skip', replaceTimestamp: string }
  const [decisions, setDecisions] = useState(() => {
    const initial = {};
    conflicts.forEach(conflict => {
      const key = `${conflict.new_data.kpi_id}_${conflict.new_data.date}`;
      // Default action based on conflict type
      if (conflict.conflict_type === 'exact_match') {
        initial[key] = { action: 'skip', replaceTimestamp: null };
      } else {
        initial[key] = { action: 'add', replaceTimestamp: null };
      }
    });
    return initial;
  });

  const handleActionChange = (conflict, action) => {
    const key = `${conflict.new_data.kpi_id}_${conflict.new_data.date}`;
    
    // If action is 'replace', use most recent existing entry (first in array)
    const replaceTimestamp = action === 'replace' && conflict.existing_data.length > 0
      ? conflict.existing_data[0].submission_timestamp
      : null;

    setDecisions(prev => ({
      ...prev,
      [key]: { action, replaceTimestamp }
    }));
  };

  const handleResolve = () => {
    // Build resolution array
    const resolutions = [];

    // Add decisions for conflicts
    conflicts.forEach(conflict => {
      const key = `${conflict.new_data.kpi_id}_${conflict.new_data.date}`;
      const decision = decisions[key];
      
      resolutions.push({
        action: decision.action,
        kpi_id: conflict.new_data.kpi_id,
        date: conflict.new_data.date || new Date().toISOString().split('T')[0],
        new_value: conflict.new_data.value,
        new_unit: conflict.new_data.unit,
        new_comment: conflict.new_data.comment,
        replace_timestamp: decision.replaceTimestamp
      });
    });

    // Add no_conflicts as "add" actions
    noConflicts.forEach(datapoint => {
      resolutions.push({
        action: 'add',
        kpi_id: datapoint.kpi_id,
        date: datapoint.date || new Date().toISOString().split('T')[0],
        new_value: datapoint.value,
        new_unit: datapoint.unit,
        new_comment: datapoint.comment,
        replace_timestamp: null
      });
    });

    onResolve(resolutions);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const formatTimestamp = (timestampStr) => {
    return new Date(timestampStr).toLocaleString('fr-FR');
  };

  return (
    <div className="conflict-modal-overlay">
      <div className="conflict-modal">
        <div className="conflict-modal-header">
          <h2>Conflits détectés</h2>
          <p className="conflict-summary">
            {conflicts.length} conflit(s) trouvé(s), {noConflicts.length} nouveau(x) datapoint(s)
          </p>
        </div>

        <div className="conflict-modal-body">
          {conflicts.map((conflict, idx) => {
            const key = `${conflict.new_data.kpi_id}_${conflict.new_data.date}`;
            const currentDecision = decisions[key];
            const mostRecentExisting = conflict.existing_data[0]; // Already sorted by timestamp DESC

            return (
              <div key={idx} className="conflict-item">
                <div className="conflict-item-header">
                  <span className="conflict-kpi-id">{conflict.new_data.kpi_id}</span>
                  <span className="conflict-date">{formatDate(conflict.new_data.date)}</span>
                  <span className={`conflict-badge ${conflict.conflict_type}`}>
                    {conflict.conflict_type === 'exact_match' ? 'Doublon exact' : 'Valeurs différentes'}
                  </span>
                </div>

                <div className="conflict-comparison">
                  <div className="conflict-column existing">
                    <h4>Données existantes</h4>
                    {conflict.existing_data.length > 1 && (
                      <p className="multiple-warning">
                        ⚠️ {conflict.existing_data.length} entrées trouvées (affiche la plus récente)
                      </p>
                    )}
                    <div className="data-preview">
                      <p><strong>Valeur:</strong> {mostRecentExisting.value} {mostRecentExisting.unit}</p>
                      <p><strong>Commentaire:</strong> {mostRecentExisting.comment || 'N/A'}</p>
                      <p className="metadata">
                        Par <strong>{mostRecentExisting.user_email}</strong> le {formatTimestamp(mostRecentExisting.submission_timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="conflict-column new">
                    <h4>Nouvelles données</h4>
                    <div className="data-preview">
                      <p><strong>Valeur:</strong> {conflict.new_data.value} {conflict.new_data.unit}</p>
                      <p><strong>Commentaire:</strong> {conflict.new_data.comment || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="conflict-actions">
                  <label>Action:</label>
                  <select
                    value={currentDecision.action}
                    onChange={(e) => handleActionChange(conflict, e.target.value)}
                    className="action-select"
                  >
                    <option value="add">Ajouter une nouvelle ligne</option>
                    <option value="replace">Remplacer l'existant</option>
                    <option value="skip">Ignorer</option>
                  </select>

                  {currentDecision.action === 'replace' && (
                    <p className="action-description">
                      ℹ️ Remplacera la valeur de {mostRecentExisting.user_email} 
                      ({formatTimestamp(mostRecentExisting.submission_timestamp)})
                    </p>
                  )}
                  {currentDecision.action === 'add' && (
                    <p className="action-description">
                      ℹ️ Les deux valeurs coexisteront (historique préservé)
                    </p>
                  )}
                  {currentDecision.action === 'skip' && (
                    <p className="action-description">
                      ℹ️ Ce datapoint ne sera pas importé
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="conflict-modal-footer">
          <button onClick={onCancel} className="btn-cancel">
            Annuler
          </button>
          <button onClick={handleResolve} className="btn-resolve">
            Appliquer les décisions
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;
