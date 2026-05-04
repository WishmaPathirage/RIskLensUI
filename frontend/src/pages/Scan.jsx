import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ChatBot from '../components/ui/ChatBot';
import { Upload, FileText, CheckCircle, AlertTriangle, XCircle, Activity, Rocket, X, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

const Scan = () => {
    const [inputType, setInputType] = useState('text'); // 'text' or 'file'
    const [showModal, setShowModal] = useState(false);
    const [textContent, setTextContent] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    const [showFutureWorkPopup, setShowFutureWorkPopup] = useState(false);
    const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

    const loadingMessages = [
        "Initializing RiskLens Secure Engine...",
        "Running DistilBERT Privacy Models...",
        "Extracting Deep Features via LIME...",
        "Detecting Protected PII Entities...",
        "Finalizing Privacy Risk Score..."
    ];

    React.useEffect(() => {
        let interval;
        if (isAnalyzing) {
            setLoadingMessageIdx(0);
            interval = setInterval(() => {
                setLoadingMessageIdx(prev => Math.min(prev + 1, loadingMessages.length - 1));
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isAnalyzing]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleAnalyze = async (e) => {
        e.preventDefault();
        setError(null);
        setResult(null);

        if (inputType === 'text' && !textContent.trim()) {
            setError('Please enter some text to analyze.');
            return;
        }
        if (inputType === 'file' && !selectedFile) {
            setError('Please select a file to upload.');
            return;
        }

        setIsAnalyzing(true);

        try {
            // Simulate formData if we were sending a file
            // const formData = new FormData();
            // if (inputType === 'file') formData.append('file', selectedFile);
            // else formData.append('text', textContent);

            const response = await api.post('/scan', {
                type: inputType,
                content: inputType === 'text' ? textContent : selectedFile.name
            });

            setResult({
                ...response.data,
                originalText: inputType === 'text' ? textContent : selectedFile.name
            });
            
            // Auto-save the report quietly in the background
            try {
                const savePayload = {
                    ...response.data,
                    originalText: inputType === 'text' ? textContent : selectedFile.name
                };
                await api.post('/reports/save', { result: savePayload });
            } catch (saveErr) {
                console.error("Auto-save failed:", saveErr);
            }
        } catch (err) {
            setError('Analysis failed. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveReport = async () => {
        if (!result) return;
        setIsSaving(true);
        try {
            await api.post('/reports/save', { result });
            navigate('/reports');
        } catch (err) {
            setError('Failed to save report.');
            setIsSaving(false);
        }
    };

    const handleDownloadReport = () => {
        if (!result) return;
        
        const doc = new jsPDF();
        let currentY = 20;

        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("RiskLens Privacy Scan Report", 20, currentY);
        currentY += 15;

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${new Date().toLocaleString()}`, 20, currentY); currentY += 8;
        doc.text(`Risk Score: ${result.riskScore}/100`, 20, currentY); currentY += 8;
        doc.text(`Risk Level: ${result.riskLevel} Risk`, 20, currentY); currentY += 8;
        doc.text(`Model Confidence: ${result.confidence}%`, 20, currentY); currentY += 15;

        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text("ORIGINAL TEXT ANALYZED", 20, currentY); currentY += 8;
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        const oText = result.originalText || 'No text provided.';
        const splitOText = doc.splitTextToSize(oText, 170);
        doc.text(splitOText, 20, currentY);
        currentY += (splitOText.length * 6) + 10;

        // Auto-page check
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text("DETECTED ENTITIES", 20, currentY); currentY += 8;
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        const entitiesText = result.detectedEntities && result.detectedEntities.length > 0 ? result.detectedEntities.join(', ') : 'None';
        const splitEntities = doc.splitTextToSize(entitiesText, 170);
        doc.text(splitEntities, 20, currentY);
        currentY += (splitEntities.length * 6) + 10;

        if (currentY > 250) { doc.addPage(); currentY = 20; }

        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text("EXPLANATION", 20, currentY); currentY += 8;
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        const expText = result.explanation || 'No detailed explanation provided.';
        const splitExp = doc.splitTextToSize(expText, 170);
        doc.text(splitExp, 20, currentY);
        currentY += (splitExp.length * 6) + 10;

        if (currentY > 250) { doc.addPage(); currentY = 20; }

        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text("SUGGESTIONS", 20, currentY); currentY += 8;
        doc.setFontSize(11); doc.setFont("helvetica", "normal");
        if (result.recommendations && result.recommendations.length > 0) {
            result.recommendations.forEach(rec => {
                const splitRec = doc.splitTextToSize(`• ${rec}`, 170);
                doc.text(splitRec, 20, currentY);
                currentY += (splitRec.length * 6) + 2;
                if (currentY > 270) { doc.addPage(); currentY = 20; }
            });
        } else {
            doc.text("No specific recommendations.", 20, currentY);
        }

        doc.save(`RiskLens_Report_${new Date().getTime()}.pdf`);
    };

    const getRiskColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'high': return 'text-red-700 bg-red-50 border-red-200';
            case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
            case 'low': return 'text-green-700 bg-green-50 border-green-200';
            default: return 'text-slate-700 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">New Privacy Risk Scan</h1>

            <div className="flex flex-col gap-8">
                {/* Input Section */}
                <div className="w-full space-y-6">
                    <Card className="p-6">
                        <div className="flex space-x-4 mb-6">
                            <button
                                onClick={() => setInputType('text')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md border ${inputType === 'text' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                            >
                                <FileText className="inline-block w-4 h-4 mr-2" /> Text Input
                            </button>
                            <button
                                onClick={() => setShowFutureWorkPopup(true)}
                                className={`flex-1 py-2 text-sm font-medium rounded-md border ${inputType === 'file' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors'}`}
                            >
                                <Upload className="inline-block w-4 h-4 mr-2" /> File Upload
                            </button>
                        </div>

                        {inputType === 'text' ? (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-slate-700">Enter text to analyze</label>
                                <textarea
                                    className="w-full h-48 rounded-md border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Paste prompt, output, or dataset sample here..."
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value)}
                                ></textarea>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:bg-slate-50 transition-colors">
                                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                                <div className="mt-4 flex text-sm text-slate-600 justify-center">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                        <span>Upload a file</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    PDF, DOCX, TXT, CSV up to 10MB
                                </p>
                                {selectedFile && (
                                    <div className="mt-4 flex items-center justify-center text-sm text-blue-600 font-medium">
                                        <FileText className="h-4 w-4 mr-1" />
                                        {selectedFile.name}
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

                        <div className="mt-6 flex justify-end">
                            <Button onClick={handleAnalyze} isLoading={isAnalyzing} size="lg">
                                Analyze Risk
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Results Preview (or Empty State) */}
                <div className="w-full">
                    {result ? (
                        <div className="space-y-6 animate-in slide-in-from-right duration-500">
                            <Card className={`p-6 border-l-4 ${result.riskLevel === 'High' ? 'border-l-red-500' : result.riskLevel === 'Medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Analysis Result</h3>

                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-slate-500">Risk Score</span>
                                    <span className="text-2xl font-bold">{result.riskScore}/100</span>
                                </div>

                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.riskLevel)} mb-6`}>
                                    {result.riskLevel === 'High' && <AlertTriangle className="mr-2 h-4 w-4" />}
                                    {result.riskLevel === 'Medium' && <AlertTriangle className="mr-2 h-4 w-4" />}
                                    {result.riskLevel === 'Low' && <CheckCircle className="mr-2 h-4 w-4" />}
                                    {result.riskLevel} Risk
                                </div>

                                <div className="space-y-6 mb-6 mt-4">
                                    {/* Explanation */}
                                    {result.explanation && (
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <h4 className="font-semibold text-sm text-slate-900 mb-2">Model Explanation</h4>
                                            <p className="text-sm text-slate-700 leading-relaxed">{result.explanation}</p>
                                        </div>
                                    )}

                                    {/* Entities */}
                                    {result.detectedEntities && result.detectedEntities.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-sm text-slate-900 mb-3">Detected Entities</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {result.detectedEntities.map((ent, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 shadow-sm">
                                                        {ent}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Important Words Row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {/* Attention Words */}
                                        {result.topImportantWords && result.topImportantWords.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-sm text-slate-900 mb-3">Top Important Words</h4>
                                                <ul className="text-sm text-slate-600 space-y-1.5">
                                                    {result.topImportantWords.slice(0, 6).map((item, idx) => (
                                                        <li key={idx} className="flex items-center bg-slate-50 px-3 py-2 rounded-md border border-slate-200 shadow-sm">
                                                            <span className="font-medium text-slate-700">{item[0]}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* LIME Words */}
                                        {result.limeFeatures && result.limeFeatures.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-sm text-slate-900 mb-3">LIME Impact Sub-words</h4>
                                                <ul className="text-sm text-slate-600 space-y-1.5">
                                                    {result.limeFeatures.slice(0, 6).map((item, idx) => (
                                                        <li key={idx} className="flex items-center bg-slate-50 px-3 py-2 rounded-md border border-slate-200 shadow-sm">
                                                            <span className="font-medium text-slate-700">{item[0]}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Suggestions */}
                                    {result.recommendations && result.recommendations.length > 0 && (
                                        <div className="pt-2">
                                            <h4 className="font-semibold text-sm text-slate-900 mb-3">Suggestions</h4>
                                            <ul className="text-sm text-slate-700 space-y-3">
                                                {result.recommendations.map((rec, idx) => (
                                                    <li key={idx} className="flex items-start bg-blue-50/50 p-3 rounded-md border border-blue-100">
                                                        <CheckCircle className="mr-3 h-5 w-5 text-blue-500 flex-shrink-0" />
                                                        <span className="leading-snug">{rec}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Legacy explanations fallback */}
                                    {result.explanations && !result.explanation && (
                                        <div>
                                            <h4 className="font-semibold text-sm text-slate-900 mb-2">Key Vulnerabilities</h4>
                                            <ul className="text-sm text-slate-600 space-y-2">
                                                {result.explanations.map((exp, idx) => (
                                                    <li key={idx} className="flex items-start">
                                                        <span className="mr-2 mt-1 h-1.5 w-1.5 bg-slate-400 rounded-full flex-shrink-0"></span>
                                                        {exp}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-slate-200 pt-4 mb-6">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Model Confidence</span>
                                        <span className="font-medium">{result.confidence}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                                        <div className="bg-slate-400 h-1.5 rounded-full" style={{ width: `${result.confidence}%` }}></div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <Button onClick={handleDownloadReport} className="w-1/2" variant="outline">
                                        <Download className="mr-2 h-4 w-4" /> Download Report
                                    </Button>
                                    <Button onClick={() => navigate('/reports')} className="w-1/2" variant="outline">
                                        <Activity className="mr-2 h-4 w-4" /> View in Reports
                                    </Button>
                                </div>

                                {/* Embedded Contextual Chatbot */}
                                <ChatBot variant="embedded" context={result} />
                            </Card>
                        </div>
                    ) : isAnalyzing ? (
                        <div className="h-full flex items-center justify-center p-12 border-2 border-slate-100 bg-white rounded-xl shadow-sm">
                            <div className="text-center space-y-6 animate-in fade-in duration-500">
                                <div className="relative mx-auto w-20 h-20">
                                    <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-ping opacity-75"></div>
                                    <div className="absolute inset-0 flex items-center justify-center bg-blue-600 rounded-full shadow-lg z-10">
                                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Analyzing Privacy Risk</h3>
                                    <p className="text-sm font-medium text-blue-600 animate-pulse transition-all duration-300">
                                        {loadingMessages[loadingMessageIdx]}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                            <div className="text-center">
                                <Activity className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>Analysis results will appear here</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Future Work Popup */}
            {showFutureWorkPopup && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 relative">
                        <button 
                            onClick={() => setShowFutureWorkPopup(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                            <Rocket className="h-6 w-6" />
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Coming Soon ✨</h3>
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            The file upload feature is currently under development! In upcoming versions, you'll be able to directly scan and analyze PDFs, Word documents, and CSV files.
                            <br/><br/>
                            For now, please continue using the <strong>Text Input</strong> option to analyze your data.
                        </p>
                        
                        <Button 
                            onClick={() => setShowFutureWorkPopup(false)} 
                            className="w-full"
                        >
                            Got it, thanks!
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scan;
