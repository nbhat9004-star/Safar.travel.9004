'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Map, X, Star, ListChecks, AlertTriangle, CalendarRange, Users, Loader2, MapPin, Navigation } from 'lucide-react';
import Navbar from '@/components/safar/Navbar';
import Footer from '@/components/safar/Footer';
import PropertyCard from '@/components/safar/PropertyCard';
import CategoryPills from '@/components/safar/CategoryPills';
import AIAssistantFloating from '@/components/safar/AIAssistantFloating';
import ServiceSelector from '@/components/safar/ServiceSelector';
import ServiceBadges from '@/components/safar/ServiceBadges';
import CardSkeleton from '@/components/safar/CardSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { IMG } from '@/lib/data';
import { useListings } from '@/lib/listings-api';
import { calculateListingDistance, formatDistance } from '@/lib/location-utils';
import { toast } from 'sonner';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cat, setCat] = useState('all');
  // Initialize search state from URL params so the hero search submission persists
  const [q, setQ] = useState(searchParams.get('location') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [guests, setGuests] = useState(Number(searchParams.get('guests')) || 0);
  const [price, setPrice] = useState([1000, 10000]);
  const [sort, setSort] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [mapView, setMapView] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  
  // Near Me state
  const [nearMeMode, setNearMeMode] = useState(searchParams.get('nearme') === 'true');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [requestingLocation, setRequestingLocation] = useState(false);

  // Keep URL in sync (so refresh / share preserves search)
  useEffect(() => {
    const qp = new URLSearchParams();
    if (q) qp.set('location', q);
    if (checkIn) qp.set('checkIn', checkIn);
    if (checkOut) qp.set('checkOut', checkOut);
    if (guests > 0) qp.set('guests', String(guests));
    if (nearMeMode) qp.set('nearme', 'true');
    const next = qp.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(`/explore${next ? '?' + next : ''}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, checkIn, checkOut, guests, nearMeMode]);

  // Handle Near Me mode activation
  useEffect(() => {
    if (nearMeMode && !userLocation && !locationError && !requestingLocation) {
      requestUserLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearMeMode]);

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      toast.error('Geolocation not supported');
      return;
    }

    setRequestingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setRequestingLocation(false);
        toast.success('Location detected!');
      },
      (error) => {
        let message = 'Unable to get your location';
        if (error.code === 1) {
          message = 'Location permission denied';
        } else if (error.code === 2) {
          message = 'Location unavailable';
        } else if (error.code === 3) {
          message = 'Location request timeout';
        }
        setLocationError(message);
        setRequestingLocation(false);
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  };

  // Map UI category -> API filter (subcategory for stays; category for transport/tour/experience)
  const apiParams = useMemo(() => {
    const p = { minPrice: price[0], maxPrice: price[1], limit: 60 };
    if (q) p.location = q;
    if (checkIn && checkOut && checkOut > checkIn) {
      p.checkIn = checkIn;
      p.checkOut = checkOut;
    }
    if (guests > 0) p.guests = guests;
    if (selectedServices.length) p.services = selectedServices;
    if (cat !== 'all') {
      if (['houseboat','cabin','cottage','home','camp'].includes(cat)) { p.category = 'stay'; p.subcategory = cat; }
      else { p.category = cat; }
    }
    return p;
  }, [cat, q, checkIn, checkOut, guests, price, selectedServices]);

  const { listings, total, loading, error, refresh } = useListings(apiParams, [JSON.stringify(apiParams)]);

  const list = useMemo(() => {
    let arr = [...listings];
    
    // Add distance to each listing if in Near Me mode
    if (nearMeMode && userLocation) {
      arr = arr.map(listing => ({
        ...listing,
        distance: calculateListingDistance(userLocation.lat, userLocation.lon, listing)
      }));
      
      // Sort by distance in Near Me mode
      arr.sort((a, b) => a.distance - b.distance);
    } else {
      // Regular sorting
      if (sort === 'price-asc') arr.sort((a,b)=>a.price-b.price);
      if (sort === 'price-desc') arr.sort((a,b)=>b.price-a.price);
      if (sort === 'rating') arr.sort((a,b)=>b.rating-a.rating);
    }
    
    return arr;
  }, [listings, sort, nearMeMode, userLocation]);

  const hasDateFilter = checkIn && checkOut && checkOut > checkIn;
  const hasGuestFilter = guests > 0;
  const today = todayStr();

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 md:pt-28">
        {/* Header search */}
        <section className="container">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white border rounded-full px-4 py-2.5 shadow-sm">
              <Search className="size-4 text-muted-foreground" />
              <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search Srinagar, Gulmarg, houseboats..." className="border-0 shadow-none focus-visible:ring-0 px-0 h-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-full relative shrink-0" onClick={()=>setShowFilters(true)}>
                <SlidersHorizontal className="size-4 mr-2" /> Filters
                {selectedServices.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald2 text-white text-[10px] font-bold">{selectedServices.length}</span>}
              </Button>
              <select value={sort} onChange={(e)=>setSort(e.target.value)} className="rounded-full border bg-white px-4 text-sm h-10 min-w-0 max-w-[140px]">
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top rated</option>
              </select>
              <Button variant={mapView ? 'default' : 'outline'} onClick={()=>setMapView(!mapView)} className="rounded-full shrink-0"><Map className="size-4 mr-2" /> {mapView ? 'List' : 'Map'}</Button>
            </div>
          </motion.div>
          <div className="mt-5"><CategoryPills value={cat} onChange={setCat} /></div>

          {/* Near Me banner */}
          {nearMeMode && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              {requestingLocation && (
                <div className="px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-3">
                  <Loader2 className="size-5 text-blue-600 animate-spin shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-blue-900">Requesting your location...</div>
                    <div className="text-xs text-blue-700 mt-0.5">Please allow location access in your browser</div>
                  </div>
                </div>
              )}
              
              {locationError && (
                <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-amber-900">Location access denied</div>
                      <div className="text-xs text-amber-700 mt-0.5">{locationError}</div>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-full shrink-0" onClick={requestUserLocation}>
                      Retry
                    </Button>
                  </div>
                  <div className="mt-3 text-xs text-amber-700">
                    Please enable location access in your browser settings to see nearby listings.
                  </div>
                </div>
              )}
              
              {userLocation && !locationError && !requestingLocation && (
                <div className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                  <div className="size-9 rounded-full bg-emerald2 grid place-items-center shrink-0">
                    <Navigation className="size-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-emerald-900">Showing properties near you</div>
                    <div className="text-xs text-emerald-700 mt-0.5">Sorted by distance • Closest first</div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="rounded-full shrink-0 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100" 
                    onClick={() => setNearMeMode(false)}
                  >
                    <X className="size-4 mr-1" /> Clear
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Active search filters: dates + guests */}
          {(hasDateFilter || hasGuestFilter) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap text-sm">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active search</div>
              {hasDateFilter && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald2 text-xs font-semibold">
                  <CalendarRange className="size-3.5" />
                  {new Date(checkIn).toLocaleDateString()} → {new Date(checkOut).toLocaleDateString()}
                  <button onClick={() => { setCheckIn(''); setCheckOut(''); }} aria-label="Clear dates" className="ml-1 hover:text-emerald2-deep"><X className="size-3" /></button>
                </div>
              )}
              {hasGuestFilter && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald2 text-xs font-semibold">
                  <Users className="size-3.5" /> {guests} {guests === 1 ? 'guest' : 'guests'}
                  <button onClick={() => setGuests(0)} aria-label="Clear guests" className="ml-1 hover:text-emerald2-deep"><X className="size-3" /></button>
                </div>
              )}
            </div>
          )}

          {selectedServices.length > 0 && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5"><ListChecks className="size-3.5" /> Filtering by services</div>
              <div className="flex-1"><ServiceBadges ids={selectedServices} max={12} size="sm" /></div>
              <button onClick={()=>setSelectedServices([])} className="text-xs font-semibold text-emerald2 hover:underline">Clear</button>
            </div>
          )}
        </section>

        {/* Results */}
        <section className="container py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {loading ? 'Loading stays…' : <><span className="font-semibold text-charcoal">{total}</span> stays &amp; experiences in Kashmir</>}
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground"><Star className="size-3.5 text-gold fill-gold" /> Avg 4.9 · Verified hosts</div>
          </div>

          {error && (
            <div className="text-center py-16 border rounded-3xl bg-rose-50/40 border-rose-200">
              <AlertTriangle className="size-7 mx-auto text-rose-500" />
              <div className="font-display text-lg font-bold mt-3">Could not load listings</div>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" className="rounded-full mt-5" onClick={refresh}>Try again</Button>
            </div>
          )}

          {!error && loading && <CardSkeleton count={8} />}

          {!error && !loading && (
            mapView ? (
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-h-[78vh] overflow-y-auto pr-1">
                  {list.map((l, i) => <PropertyCard key={l.id} item={l} index={i} />)}
                </div>
                <div className="sticky top-28 h-[78vh] rounded-3xl overflow-hidden border bg-secondary relative">
                  <img src={IMG.dal2} alt="map" className="size-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent" />
                  {list.slice(0,8).map((l, i) => (
                    <div key={l.id} style={{ left: `${10 + (i*9)%75}%`, top: `${15 + (i*13)%65}%` }} className="absolute -translate-x-1/2 -translate-y-1/2">
                      <div className="px-3 py-1.5 rounded-full bg-white shadow-lg text-xs font-semibold text-charcoal hover:bg-charcoal hover:text-white transition cursor-pointer">
                        {l.displayPrice && l.displayPrice < l.price && <span className="opacity-70">From </span>}
                        ₹{(l.displayPrice || l.price).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full glass text-xs">Map view · demo</div>
                </div>
              </div>
            ) : (
              list.length === 0 ? (
                <div className="text-center py-20 border rounded-3xl bg-white">
                  <div className="size-14 mx-auto rounded-2xl bg-secondary grid place-items-center"><Search className="size-6 text-muted-foreground" /></div>
                  <div className="font-display text-xl font-bold mt-4">No matches found</div>
                  <p className="text-sm text-muted-foreground mt-1">Try removing some service filters or widening your price range.</p>
                  <Button variant="outline" className="rounded-full mt-5" onClick={()=>{setSelectedServices([]); setPrice([500,15000]); setCat('all');}}>Reset filters</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {list.map((l, i) => <PropertyCard key={l.id} item={l} index={i} />)}
                </div>
              )
            )
          )}
        </section>
      </div>

      {/* Filters Drawer */}
      <AnimatePresence>
      {showFilters && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex justify-end" onClick={()=>setShowFilters(false)}>
          <motion.div onClick={(e)=>e.stopPropagation()} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 240, damping: 30 }}
            className="w-full md:max-w-2xl bg-white h-full overflow-y-auto border-l shadow-2xl">
            <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-xl">Filters</h3>
                <p className="text-xs text-muted-foreground">{list.length} matching stays &amp; experiences</p>
              </div>
              <button onClick={()=>setShowFilters(false)} className="size-9 grid place-items-center rounded-full hover:bg-secondary"><X className="size-5" /></button>
            </div>
            <div className="px-6 py-6 space-y-8">
              {/* Price */}
              <div>
                <div className="text-sm font-semibold">Price range</div>
                <div className="text-xs text-muted-foreground">₹{price[0].toLocaleString('en-IN')} — ₹{price[1].toLocaleString('en-IN')} per night</div>
                <div className="px-1 mt-4"><Slider min={500} max={15000} step={100} value={price} onValueChange={setPrice} /></div>
              </div>

              {/* Services */}
              <div>
                <div className="text-sm font-semibold flex items-center justify-between">
                  <span>Services offered</span>
                  {selectedServices.length > 0 && <span className="text-xs text-emerald2 font-semibold">{selectedServices.length} selected</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Show only listings that include <span className="font-semibold">all</span> selected services.</p>
                <ServiceSelector value={selectedServices} onChange={setSelectedServices} compact limit={4} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full" onClick={()=>{setPrice([1000,10000]); setCat('all'); setSelectedServices([]);}}>Reset all</Button>
              <Button className="flex-1 rounded-full bg-gradient-emerald" onClick={()=>setShowFilters(false)}>Show {list.length} results</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <Footer />
      <AIAssistantFloating />
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald2" />
      </main>
    }>
      <ExploreContent />
    </Suspense>
  );
}
