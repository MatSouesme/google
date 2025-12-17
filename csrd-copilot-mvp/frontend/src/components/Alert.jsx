import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import './Alert.css';

const Alert = ({ type = 'info', title, message, action, onClose, dismissible = true }) => {
    const icons = {
        success: <CheckCircle size={20} />,
        warning: <AlertTriangle size={20} />,
        error: <AlertCircle size={20} />,
        info: <Info size={20} />
    };

    return (
        <div className={`alert alert-${type}`}>
            <div className="alert-icon">
                {icons[type]}
            </div>
            <div className="alert-content">
                {title && <div className="alert-title">{title}</div>}
                <div className="alert-message">{message}</div>
                {action && (
                    <button className="alert-action" onClick={action.onClick}>
                        {action.label}
                    </button>
                )}
            </div>
            {dismissible && onClose && (
                <button className="alert-close" onClick={onClose}>
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

export default Alert;
