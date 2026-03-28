import React from "react";

const LimeChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    const maxVal = Math.max(...data.map(([_, v]) => Math.abs(v)));

    return (
        <div className="mt-4">
            <h3 className="font-semibold mb-2">Model Explanation (LIME)</h3>

            {data.map(([word, value], index) => {
                const width = (Math.abs(value) / maxVal) * 100;
                const isPositive = value > 0;

                return (
                    <div key={index} className="mb-2">
                        <div className="flex justify-between text-sm">
                            <span>{word}</span>
                            <span>{value.toFixed(2)}</span>
                        </div>

                        <div className="w-full bg-gray-200 h-2 rounded">
                            <div
                                className={`h-2 rounded ${isPositive ? "bg-red-500" : "bg-blue-500"
                                    }`}
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default LimeChart;