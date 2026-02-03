import React from 'react';

const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: "bg-slate-100 text-slate-800",
        success: "bg-green-100 text-green-800", // Low Risk
        warning: "bg-yellow-100 text-yellow-800", // Medium Risk
        danger: "bg-red-100 text-red-800", // High Risk
        info: "bg-blue-100 text-blue-800",
    };

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
