import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { itineraryAPI } from '../services/api';
import { 
  Compass, MapPin, Calendar, Globe, Clock, Printer, 
  Copy, Check, FileText, Bed, Plane, Train, Bus
} from 'lucide-react';

const ShareView = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [isCloning, setIsCloning] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if token exists to enable Cloning
    if (localStorage.getItem('token')) {
      setIsLoggedIn(true);
    }

    const fetchShared = async () => {
      try {
        const res = await itineraryAPI.getShared(shareId);
        setItinerary(res.data.data);
      } catch (err) {
        console.error('Error fetching shared:', err);
        setErrorMsg('Itinerary not found or is no longer shared publicly.');
      } finally {
        setLoading(false);
      }
    };

    fetchShared();
  }, [shareId]);

  const handlePrint = () => {
    window.print();
  };

  const handleClone = async () => {
    if (!isLoggedIn) {
      // Redirect to login but remember this share page
      navigate('/login');
      return;
    }

    setIsCloning(true);
    try {
      // Post to generate endpoint using current itinerary details
      const res = await itineraryAPI.generate({
        destination: itinerary.destination,
        title: `${itinerary.title} (Cloned)`,
        bookings: itinerary.bookings || []
      });
      alert('Itinerary cloned successfully to your account!');
      navigate('/');
    } catch (err) {
      console.error('Clone failed:', err);
      alert('Failed to clone itinerary.');
    } finally {
      setIsCloning(false);
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
        <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-8 max-w-md">
          <Compass className="mx-auto h-12 w-12 text-slate-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-slate-200">Failed to Load Trip</h2>
          <p className="mt-2 text-sm text-slate-500">{errorMsg}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 inline-flex rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition-all"
          >
            Go to RoamAI Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans print:bg-white print:text-slate-900 pb-16">
      
      {/* HEADER BAR (hidden in print) */}
      <nav className="h-auto md:h-20 py-4 md:py-0 border-b border-slate-900 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-10 w-10 items-center justify-center flex rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md">
            <Compass className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Roam<span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-900 hover:border-slate-700 transition-all"
          >
            <Printer className="h-4 w-4" />
            Print / Export PDF
          </button>
          
          <button
            onClick={handleClone}
            disabled={isCloning}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-400 transition-all active:scale-95 disabled:opacity-50"
          >
            {isCloning ? 'Saving...' : isLoggedIn ? 'Save to My Account' : 'Clone Trip'}
          </button>
        </div>
      </nav>

      {/* CORE DISPLAY */}
      <div className="max-w-4xl w-full mx-auto px-4 md:px-6 mt-6 md:mt-10 print:mt-0 print:px-0">
        
        {/* Banner Details */}
        <div className="border-b border-slate-900 print:border-slate-300 pb-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white print:text-slate-900">
            {itinerary.title}
          </h1>
          <p className="mt-2 text-sm text-slate-400 print:text-slate-600 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-sky-400 print:text-slate-500" />
            {itinerary.destination}
            {itinerary.startDate && (
              <>
                <span className="mx-2 text-slate-800 print:text-slate-300">|</span>
                <Calendar className="h-4 w-4 text-indigo-400 print:text-slate-500" />
                <span>
                  {new Date(itinerary.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  {itinerary.endDate && ` - ${new Date(itinerary.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}`}
                </span>
              </>
            )}
          </p>
          <div className="mt-4 text-xs text-slate-500 print:hidden">
            Shared publicly. Use "Print" to export this itinerary as a travel document.
          </div>
        </div>

        {/* LOGISTICS & BOOKINGS SUMMARY */}
        {itinerary.bookings && itinerary.bookings.length > 0 && (
          <div className="space-y-3 mb-8 print:mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 print:text-slate-600">Attached Logistics</h3>
            <div className="flex flex-wrap gap-3">
              {itinerary.bookings.map((booking, idx) => (
                <div key={idx} className="flex items-center gap-2.5 rounded-lg border border-slate-900 print:border-slate-200 bg-slate-900/30 print:bg-slate-50 px-3 py-2 text-xs">
                  {getBookingIcon(booking.type)}
                  <div>
                    <p className="font-semibold text-slate-300 print:text-slate-700">{booking.provider || 'Booking'}</p>
                    {booking.referenceNumber && <p className="text-[10px] text-slate-500 print:text-slate-500 font-mono mt-0.5">Ref: {booking.referenceNumber}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DAY BY DAY PLAN */}
        {/* Interactive view for online readers */}
        <div className="print:hidden space-y-6">
          <div className="flex gap-2 border-b border-slate-900 pb-3 overflow-x-auto">
            {itinerary.days.map((day, idx) => (
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

          <div className="relative border-l-2 border-slate-900 pl-6 ml-3 space-y-8">
            {(itinerary.days[activeTab]?.activities || []).map((activity, actIdx) => (
              <div key={actIdx} className="relative">
                <div className="absolute top-1 left-[-31px] h-4 w-4 rounded-full border-2 border-slate-950 bg-sky-500"></div>
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
              </div>
            ))}
          </div>
        </div>

        {/* Print-optimized fully unrolled continuous timeline (shown on print only) */}
        <div className="hidden print:block space-y-10">
          {itinerary.days.map((day, idx) => (
            <div key={idx} className="space-y-4 break-inside-avoid">
              <h2 className="text-xl font-bold border-b border-slate-300 pb-2 text-slate-800">
                Day {day.dayNumber} {day.date && ` - ${new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`}
              </h2>
              
              <div className="border-l-2 border-slate-200 pl-6 ml-2 space-y-6">
                {(day.activities || []).map((activity, actIdx) => (
                  <div key={actIdx} className="relative">
                    <div className="absolute top-1.5 left-[-29px] h-2.5 w-2.5 rounded-full bg-slate-400"></div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        {activity.time && `${activity.time} | `}{activity.activity}
                      </p>
                      {activity.location && (
                        <p className="text-xs text-slate-500">📍 {activity.location}</p>
                      )}
                      {activity.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 border border-slate-100 rounded italic mt-1">{activity.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center border-t border-slate-900 print:border-slate-200 pt-8 text-xs text-slate-600">
          Powered by RoamAI Itinerary Planner
        </div>

      </div>

    </div>
  );
};

export default ShareView;
