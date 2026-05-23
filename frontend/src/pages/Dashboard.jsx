import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { itineraryAPI } from '../services/api';
import { 
  Compass, LogOut, Upload, FileText, Calendar, Plus, 
  MapPin, Share2, Trash2, Key, Check, AlertCircle, Edit2, 
  Save, X, Plane, Bed, Train, Bus, Globe, Clock, ChevronRight
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [itineraries, setItineraries] = useState([]);
  const [activeItinerary, setActiveItinerary] = useState(null);
  
  // Creation States
  const [destination, setDestination] = useState('');
  const [tripTitle, setTripTitle] = useState('');
  const [extractedBookings, setExtractedBookings] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeTab, setActiveTab] = useState(0); // For days timeline tabs

  // Editing States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDays, setEditDays] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Settings / API Key Modal State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  // Sharing Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchItineraries();
    // Check if user has stored API key
    const savedKey = localStorage.getItem('travel_gemini_key');
    if (savedKey) {
      setApiKeyInput(savedKey);
      setHasApiKey(true);
    }
  }, []);

  const fetchItineraries = async () => {
    try {
      const res = await itineraryAPI.getAll();
      setItineraries(res.data.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // API Key operations
  const saveApiKey = (e) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      localStorage.setItem('travel_gemini_key', apiKeyInput.trim());
      setHasApiKey(true);
    } else {
      localStorage.removeItem('travel_gemini_key');
      setHasApiKey(false);
    }
    setShowApiKeyModal(false);
  };

  // File Upload handling
  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await itineraryAPI.uploadDoc(formData);
      const bookingData = res.data.data;
      
      setExtractedBookings(prev => [...prev, bookingData]);
      
      // Auto fill destination if AI detected it and user hasn't typed one
      if (bookingData.destination && !destination) {
        setDestination(bookingData.destination);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.response?.data?.message || 'Error processing document. Ensure it is a valid PDF or Image.');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Drag & drop support
  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Itinerary generation
  const handleGenerateItinerary = async () => {
    if (!destination.trim()) return;
    setIsGenerating(true);

    try {
      const res = await itineraryAPI.generate({
        bookings: extractedBookings,
        destination: destination.trim(),
        title: tripTitle.trim() || `Trip to ${destination}`
      });

      const newItinerary = res.data.data;
      setItineraries(prev => [newItinerary, ...prev]);
      setActiveItinerary(newItinerary);
      setActiveTab(0);
      
      // Reset creation form
      setExtractedBookings([]);
      setDestination('');
      setTripTitle('');
    } catch (err) {
      console.error('Generation failed:', err);
      alert('Error generating itinerary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadItinerary = (itin) => {
    setActiveItinerary(itin);
    setIsEditing(false);
    setActiveTab(0);
  };

  const startNewTrip = () => {
    setActiveItinerary(null);
    setIsEditing(false);
    setExtractedBookings([]);
    setDestination('');
    setTripTitle('');
  };

  const handleDeleteItinerary = async (id) => {
    if (!window.confirm('Are you sure you want to delete this itinerary?')) return;
    try {
      await itineraryAPI.delete(id);
      setItineraries(prev => prev.filter(item => item._id !== id));
      if (activeItinerary?._id === id) {
        startNewTrip();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Editing functionality
  const startEditing = () => {
    setIsEditing(true);
    setEditTitle(activeItinerary.title);
    setEditDays(JSON.parse(JSON.stringify(activeItinerary.days))); // deep copy
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleEditActivityChange = (dayIdx, actIdx, field, value) => {
    const updated = [...editDays];
    updated[dayIdx].activities[actIdx][field] = value;
    setEditDays(updated);
  };

  const handleAddActivity = (dayIdx) => {
    const updated = [...editDays];
    updated[dayIdx].activities.push({
      time: '12:00',
      activity: 'New Activity',
      location: '',
      notes: ''
    });
    setEditDays(updated);
  };

  const handleRemoveActivity = (dayIdx, actIdx) => {
    const updated = [...editDays];
    updated[dayIdx].activities.splice(actIdx, 1);
    setEditDays(updated);
  };

  const saveItineraryEdits = async () => {
    setIsUpdating(true);
    try {
      const res = await itineraryAPI.update(activeItinerary._id, {
        title: editTitle,
        days: editDays
      });
      
      const updatedItinerary = res.data.data;
      setActiveItinerary(updatedItinerary);
      setItineraries(prev => prev.map(item => item._id === updatedItinerary._id ? updatedItinerary : item));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update itinerary:', err);
      alert('Error saving edits.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getBookingIcon = (type) => {
    switch (type) {
      case 'flight': return <Plane className="h-5 w-5 text-sky-400" />;
      case 'hotel': return <Bed className="h-5 w-5 text-indigo-400" />;
      case 'train': return <Train className="h-5 w-5 text-emerald-400" />;
      case 'bus': return <Bus className="h-5 w-5 text-amber-400" />;
      default: return <FileText className="h-5 w-5 text-slate-400" />;
    }
  };

  const getShareLink = () => {
    if (!activeItinerary) return '';
    return `${window.location.origin}/share/${activeItinerary.shareId}`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getShareLink());
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* SIDEBAR: Past Trips */}
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-900 bg-slate-900/20 p-6 flex flex-col shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 items-center justify-center flex rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md shadow-sky-500/10">
            <Compass className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Roam<span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
          </span>
        </div>

        <button
          onClick={startNewTrip}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 py-3 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-850 hover:border-slate-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 text-sky-400" />
          Plan New Journey
        </button>

        <div className="mt-8 flex-1 overflow-y-auto pr-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4 px-2">
            My Itineraries ({itineraries.length})
          </h3>
          
          {itineraries.length === 0 ? (
            <p className="text-sm text-slate-600 px-2 italic mt-4">No trips planned yet.</p>
          ) : (
            <div className="space-y-2">
              {itineraries.map((itin) => (
                <div
                  key={itin._id}
                  onClick={() => loadItinerary(itin)}
                  className={`group flex items-center justify-between rounded-xl p-3 cursor-pointer transition-all border ${
                    activeItinerary?._id === itin._id
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-200'
                      : 'bg-transparent border-transparent hover:bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Globe className={`h-5 w-5 shrink-0 ${activeItinerary?._id === itin._id ? 'text-sky-400' : 'text-slate-600'}`} />
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate leading-tight">{itin.title}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">{itin.destination}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItinerary(itin._id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 rounded transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User bar */}
        <div className="mt-auto border-t border-slate-900 pt-4 flex items-center justify-between">
          <div className="overflow-hidden mr-2">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.username}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-all"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER */}
        <header className="h-auto md:h-20 py-4 md:py-0 border-b border-slate-900 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              hasApiKey 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {hasApiKey ? 'Live Gemini AI Active' : 'Demo Mode (Mock AI)'}
            </span>
          </div>

          <button
            onClick={() => setShowApiKeyModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-900 hover:border-slate-700 transition-all"
          >
            <Key className="h-4 w-4 text-sky-400" />
            AI Key Settings
          </button>
        </header>

        {/* CONTENT PANELS */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl w-full mx-auto">
          
          {!activeItinerary ? (
            /* CREATE TRIP WORKFLOW */
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-slate-900 pb-6">
                <h2 className="text-3xl font-extrabold tracking-tight text-white">Create a New Trip</h2>
                <p className="mt-2 text-slate-400">
                  Upload your flights, hotels, or rental tickets (PDF/Images) and let AI extract information to compile a personalized day-by-day travel plan.
                </p>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => fileInputRef.current.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 cursor-pointer text-center transition-all ${
                  isUploading 
                    ? 'border-indigo-500 bg-indigo-500/5' 
                    : 'border-slate-800 bg-slate-900/10 hover:border-slate-700 hover:bg-slate-900/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileChange}
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  className="hidden"
                />

                {isUploading ? (
                  <div className="space-y-4">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                    <div>
                      <p className="text-md font-semibold text-indigo-400">Extracting details...</p>
                      <p className="text-xs text-slate-500 mt-1">Reading document with AI vision parser</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 rounded-xl bg-slate-900 p-3 text-sky-400 border border-slate-800">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-md font-semibold text-slate-200">
                      Drag & drop your travel document, or <span className="text-sky-400">browse</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Supports PDFs and Images (JPEG, PNG) up to 10MB
                    </p>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Uploaded Documents List */}
              {extractedBookings.length > 0 && (
                <div className="space-y-4 animate-slide-up">
                  <h3 className="text-lg font-bold text-slate-200">
                    Uploaded Documents ({extractedBookings.length})
                  </h3>
                  
                  <div className="grid gap-4 sm:grid-col-1 md:grid-cols-2">
                    {extractedBookings.map((booking, idx) => (
                      <div key={idx} className="flex items-start gap-4 rounded-xl border border-slate-900 bg-slate-900/30 p-4">
                        <div className="rounded-lg bg-slate-900 p-2.5">
                          {getBookingIcon(booking.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{booking.type}</span>
                            <button
                              onClick={() => setExtractedBookings(prev => prev.filter((_, i) => i !== idx))}
                              className="text-slate-500 hover:text-red-400 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-slate-200 truncate mt-1">{booking.provider || 'Unknown Provider'}</p>
                          
                          {booking.dateTime && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(booking.dateTime).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </p>
                          )}
                          
                          {(booking.origin || booking.destination) && (
                            <p className="text-xs text-slate-400 mt-1 truncate">
                              {booking.origin ? `${booking.origin} → ` : ''}{booking.destination || ''}
                            </p>
                          )}

                          {booking.referenceNumber && (
                            <span className="inline-block mt-2 font-mono text-[10px] bg-slate-900/60 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                              Ref: {booking.referenceNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generation Configuration Details */}
              <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 space-y-5">
                <h3 className="text-lg font-bold text-slate-200">Trip Settings</h3>
                
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="destination" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Destination City/Country <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-500" />
                      <input
                        id="destination"
                        type="text"
                        required
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Paris, France"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950/50 py-2.5 pr-4 pl-11 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="tripTitle" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Trip Name (Optional)
                    </label>
                    <input
                      id="tripTitle"
                      type="text"
                      value={tripTitle}
                      onChange={(e) => setTripTitle(e.target.value)}
                      placeholder="e.g. Summer Vacation in Europe"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950/50 py-2.5 px-4 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateItinerary}
                  disabled={isGenerating || !destination.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:scale-100 disabled:opacity-50 disabled:brightness-100"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                      AI Crafting Your Itinerary...
                    </>
                  ) : (
                    <>
                      <Compass className="h-5 w-5" />
                      Generate AI Itinerary
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* VIEW ITINERARY DETAIL WORKFLOW */
            <div className="space-y-8 animate-fade-in">
              
              {/* Header banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900 pb-6 gap-4">
                {isEditing ? (
                  <div className="flex-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-2xl font-extrabold text-white border-b border-sky-500 bg-transparent py-1 w-full max-w-xl outline-none focus:border-sky-400"
                    />
                    <p className="text-sm text-slate-400 mt-2 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-sky-400" />
                      {activeItinerary.destination}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">{activeItinerary.title}</h2>
                    <p className="mt-2 text-sm text-slate-400 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-sky-400" />
                      {activeItinerary.destination}
                      {activeItinerary.startDate && (
                        <>
                          <span className="mx-2 text-slate-700">|</span>
                          <Calendar className="h-4 w-4 text-indigo-400" />
                          <span>
                            {new Date(activeItinerary.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            {activeItinerary.endDate && ` - ${new Date(activeItinerary.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}`}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* Control Action Buttons */}
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveItineraryEdits}
                        disabled={isUpdating}
                        className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isUpdating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div> : <Save className="h-4 w-4" />}
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-850 hover:border-slate-700 transition-all"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={startEditing}
                        className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-900 hover:border-slate-700 transition-all"
                      >
                        <Edit2 className="h-4 w-4 text-sky-400" />
                        Edit Itinerary
                      </button>
                      
                      <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-400 transition-all active:scale-95"
                      >
                        <Share2 className="h-4 w-4" />
                        Share Trip
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* BOOKINGS ATTACHED (if any exist) */}
              {activeItinerary.bookings && activeItinerary.bookings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Logistics & Bookings</h3>
                  <div className="flex flex-wrap gap-3">
                    {activeItinerary.bookings.map((booking, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 rounded-lg border border-slate-900 bg-slate-900/30 px-3 py-2 text-xs">
                        {getBookingIcon(booking.type)}
                        <div>
                          <p className="font-semibold text-slate-300">{booking.provider || 'Booking'}</p>
                          {booking.referenceNumber && <p className="text-[10px] text-slate-500 font-mono mt-0.5">Ref: {booking.referenceNumber}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DAY BY DAY PLAN */}
              <div className="space-y-6">
                
                {/* Day selector tabs */}
                <div className="flex gap-2 border-b border-slate-900 pb-3 overflow-x-auto">
                  {(isEditing ? editDays : activeItinerary.days).map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all shrink-0 ${
                        activeTab === idx
                          ? 'bg-sky-500/15 text-sky-400'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40'
                      }`}
                    >
                      Day {day.dayNumber}
                      {day.date && (
                        <span className="block text-[10px] font-normal mt-0.5">
                          {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Day activities view */}
                <div className="space-y-6">
                  {((isEditing ? editDays : activeItinerary.days)[activeTab]?.activities || []).length === 0 ? (
                    <div className="text-center py-10 rounded-xl border border-slate-900 bg-slate-900/10">
                      <p className="text-slate-500 text-sm">No activities scheduled for this day.</p>
                      {isEditing && (
                        <button
                          onClick={() => handleAddActivity(activeTab)}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add First Activity
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-900 pl-6 ml-3 space-y-8">
                      {((isEditing ? editDays : activeItinerary.days)[activeTab]?.activities || []).map((activity, actIdx) => (
                        <div key={actIdx} className="relative group">
                          {/* Circle dot on timeline */}
                          <div className="absolute top-1 left-[-31px] h-4 w-4 rounded-full border-2 border-slate-950 bg-sky-500"></div>

                          {isEditing ? (
                            /* EDIT MODE CARD */
                            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-4 shadow-lg">
                              <div className="flex gap-4">
                                <div className="w-24 shrink-0">
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Time</label>
                                  <input
                                    type="text"
                                    value={activity.time}
                                    onChange={(e) => handleEditActivityChange(activeTab, actIdx, 'time', e.target.value)}
                                    placeholder="09:00"
                                    className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Activity Description</label>
                                  <input
                                    type="text"
                                    value={activity.activity}
                                    onChange={(e) => handleEditActivityChange(activeTab, actIdx, 'activity', e.target.value)}
                                    placeholder="Explore the city center"
                                    className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none"
                                  />
                                </div>
                              </div>

                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Location</label>
                                  <input
                                    type="text"
                                    value={activity.location || ''}
                                    onChange={(e) => handleEditActivityChange(activeTab, actIdx, 'location', e.target.value)}
                                    placeholder="Museum, Restaurant, etc."
                                    className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                                  <input
                                    type="text"
                                    value={activity.notes || ''}
                                    onChange={(e) => handleEditActivityChange(activeTab, actIdx, 'notes', e.target.value)}
                                    placeholder="Tips, booking details..."
                                    className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 outline-none"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={() => handleRemoveActivity(activeTab, actIdx)}
                                  className="text-xs text-red-500 hover:text-red-400"
                                >
                                  Remove Activity
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* DISPLAY MODE CARD */
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-baseline gap-2">
                                {activity.time && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-sky-400">
                                    <Clock className="h-3.5 w-3.5" />
                                    {activity.time}
                                  </span>
                                )}
                                <h4 className="text-base font-bold text-slate-100">{activity.activity}</h4>
                              </div>

                              {activity.location && (
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                                  {activity.location}
                                </p>
                              )}

                              {activity.notes && (
                                <p className="text-xs text-slate-400 bg-slate-900/30 border border-slate-900 rounded-lg p-2.5 max-w-2xl leading-relaxed italic">
                                  {activity.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isEditing && (
                    <button
                      onClick={() => handleAddActivity(activeTab)}
                      className="mt-4 flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-850 hover:border-slate-700 transition-all"
                    >
                      <Plus className="h-4 w-4 text-sky-400" /> Add Activity to Day {activeTab + 1}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: AI KEY SETTINGS */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
                <Key className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Gemini API Key Settings</h3>
            </div>
            
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              To trigger real-time AI ticket parsing and itinerary generation, supply a **Google Gemini API Key**.
              If empty, the app uses pre-designed local mock extraction. Your key stays saved in your browser storage.
            </p>

            <form onSubmit={saveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2.5 px-4 text-sm text-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="rounded-lg px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/25 transition-all"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SHARE TRIP LINK */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
                <Share2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Share This Trip</h3>
            </div>
            
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              Anyone with this link can view the travel details and read-only timeline without requiring an account.
            </p>

            <div className="relative mb-5">
              <input
                type="text"
                readOnly
                value={getShareLink()}
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2.5 pr-20 pl-4 text-xs font-mono text-slate-300 outline-none"
              />
              <button
                onClick={copyShareLink}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-[10px] font-bold text-sky-400 hover:bg-sky-500/20 active:scale-95 transition-all"
              >
                {shareCopied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-850 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
