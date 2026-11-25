import React, { useState, useMemo } from 'react';
import { useT } from '../../i18n/useT';
import { useBookingStore } from '../../store/useBookingStore';
import venuesData from '../../data/venues.json';
import eventsData from '../../data/events.json';
import { Venue } from '../../types';
import { HeroStadiumBackground } from './HeroStadiumBackground';
import { Search, ArrowRight, Calendar } from 'lucide-react';

export const LandingHero: React.FC = () => {
  const { language } = useT();
  const { selectVenue } = useBookingStore();

  const [chainFilter, setChainFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const venues = venuesData as unknown as Venue[];
  const stadiumVenue = venues.find((v) => v.type === 'stadium') || venues[0];
  const cinemaVenues = useMemo(() => venues.filter((v) => v.type === 'cinema'), [venues]);

  // Upcoming stadium events
  const stadiumEvents = eventsData.filter((e) => e.venueId === stadiumVenue.id);

  // Chains list for filter
  const chains = useMemo(() => {
    return Array.from(new Set(cinemaVenues.map((c) => c.chain).filter(Boolean))) as string[];
  }, [cinemaVenues]);

  // Filtered cinemas table data
  const filteredCinemas = useMemo(() => {
    return cinemaVenues.filter((venue) => {
      const matchesChain = chainFilter === 'all' || venue.chain === chainFilter;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesChain;
      const matchesText =
        venue.name[language]?.toLowerCase().includes(q) ||
        venue.name.en.toLowerCase().includes(q) ||
        venue.chain?.toLowerCase().includes(q) ||
        venue.city?.toLowerCase().includes(q) ||
        venue.location?.toLowerCase().includes(q);
      return matchesChain && matchesText;
    });
  }, [cinemaVenues, chainFilter, searchQuery, language]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#0a0b10] text-[#f1f5f9] select-none">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. HERO (Exact Viewport Fit: 100vh - 56px, min 640px) */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="relative w-full h-[calc(100vh-56px)] min-h-[640px] max-h-[1080px] flex flex-col justify-center overflow-hidden">
        {/* Live auto-orbiting background with brightened, uncropped stadium */}
        <HeroStadiumBackground />

        {/* Content Container (Left-aligned, vertically centered) */}
        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-6 my-auto">
          <div className="max-w-[580px]">
            {/* Headline with loosened letter-spacing */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-[-0.01em] text-[#f1f5f9] leading-[1.12] mb-5">
              {language === 'ne' ? 'बुकिङ गर्नुअघि आफ्नो सिट प्रत्यक्ष हेर्नुहोस्।' : 'See your seat before you book.'}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed mb-8 max-w-[500px]">
              {language === 'ne'
                ? 'टिकट काट्नुअघि नै रंगशालाको मैदान वा सिनेमाको पर्दा आफ्नै आँखाको कोणबाट ३D मा हेर्नुहोस्।'
                : 'Preview the pitch or cinema screen from your exact seat in 3D before paying.'}
            </p>

            {/* Buttons: stacked on mobile (390px), row on desktop */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => scrollToSection('stadium-section')}
                className="w-full sm:w-auto text-center px-6 py-3 rounded-lg bg-[#dc143c] hover:bg-[#b01030] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {language === 'ne' ? 'खेल रोज्नुहोस्' : 'Choose a match'}
              </button>

              <button
                onClick={() => scrollToSection('cinemas-section')}
                className="w-full sm:w-auto text-center px-6 py-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-[#f1f5f9] text-sm font-semibold transition-colors cursor-pointer"
              >
                {language === 'ne' ? 'चलचित्र रोज्नुहोस्' : 'Choose a movie'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. HOW IT WORKS (Aligned Baselines & Equal Image Heights) */}
      {/* ────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-[-0.01em] text-[#f1f5f9] mb-2">
            {language === 'ne' ? 'कसरी काम गर्छ' : 'How it works'}
          </h2>
          <p className="text-sm text-slate-400">
            {language === 'ne' ? 'तीन चरणमा आफ्नो दृश्य रोज्नुहोस्।' : 'Select your exact view in three clear steps.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="rounded-xl border border-white/10 bg-[#12141c]/50 p-4 flex flex-col h-full">
            <div className="h-44 sm:h-48 w-full rounded-lg overflow-hidden bg-black/40 mb-4 border border-white/5 shrink-0">
              <img
                src="/landing/step-1-stand.jpg"
                alt="Pick a stand"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex items-center gap-2 mb-1.5 shrink-0">
              <span className="text-xs font-mono font-bold text-[#dc143c]">01</span>
              <h3 className="text-base font-semibold text-[#f1f5f9]">
                {language === 'ne' ? 'स्ट्यान्ड रोज्नुहोस्' : 'Pick a stand'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed flex-grow">
              {language === 'ne'
                ? 'मैदानको चारैतिर रहेका स्ट्यान्ड, उचाइ र मूल्यको तुलना गर्नुहोस्।'
                : 'North Canopy, East, or Pavilion Stand with elevation and tier details.'}
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-white/10 bg-[#12141c]/50 p-4 flex flex-col h-full">
            <div className="h-44 sm:h-48 w-full rounded-lg overflow-hidden bg-black/40 mb-4 border border-white/5 shrink-0">
              <img
                src="/landing/step-2-block.jpg"
                alt="Choose your block"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex items-center gap-2 mb-1.5 shrink-0">
              <span className="text-xs font-mono font-bold text-[#dc143c]">02</span>
              <h3 className="text-base font-semibold text-[#f1f5f9]">
                {language === 'ne' ? 'ब्लक छान्नुहोस्' : 'Choose your block'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed flex-grow">
              {language === 'ne'
                ? 'कुन ब्लकबाट पिच कस्तो देखिन्छ र कति सिट उपलब्ध छन् हेर्नुहोस्।'
                : 'Drill down into individual blocks (E1–E15) to inspect row availability.'}
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-white/10 bg-[#12141c]/50 p-4 flex flex-col h-full">
            <div className="h-44 sm:h-48 w-full rounded-lg overflow-hidden bg-black/40 mb-4 border border-white/5 shrink-0">
              <img
                src="/landing/step-3-seat.jpg"
                alt="Sit in your seat"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex items-center gap-2 mb-1.5 shrink-0">
              <span className="text-xs font-mono font-bold text-[#dc143c]">03</span>
              <h3 className="text-base font-semibold text-[#f1f5f9]">
                {language === 'ne' ? 'सिटमा बस्नुहोस्' : 'Sit in your seat'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed flex-grow">
              Row K, Seat 6, NPR 650
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. TWO VENUE ENTRIES (Stadium & Cinemas: Tightened Layout) */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Entry 1: Stadium */}
          <div
            id="stadium-section"
            className="relative rounded-xl border border-white/10 overflow-hidden bg-[#12141c] p-6 sm:p-8 flex flex-col gap-6"
          >
            {/* Background 3D screenshot evenly darkened, with no UI chrome */}
            <div className="absolute inset-0 pointer-events-none">
              <img
                src="/landing/stadium-card-bg.jpg"
                alt="TU Cricket Ground 3D Canvas"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[#0a0b10]/85" />
            </div>

            {/* Header info */}
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#dc143c]">
                  {language === 'ne' ? 'क्रिकेट मैदान' : 'Cricket Stadium'}
                </span>
                <span className="text-white/20">•</span>
                <span className="text-xs text-slate-400">Kirtipur, Kathmandu</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#f1f5f9] mb-4">
                {stadiumVenue.name[language]}
              </h3>

              {/* Upcoming events rows */}
              <div className="space-y-2.5">
                {stadiumEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => selectVenue(stadiumVenue.id, evt.id)}
                    className="p-3.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#f1f5f9]">
                        {evt.title[language]}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{evt.dateISO} • {evt.time}</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-xs text-slate-400">from </span>
                      <span className="text-xs font-semibold text-amber-400">NPR 450</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button directly below event rows without empty gap */}
            <div className="relative z-10 pt-2 border-t border-white/10">
              <button
                onClick={() => selectVenue(stadiumVenue.id, stadiumEvents[0]?.id)}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#dc143c] hover:bg-[#b01030] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{language === 'ne' ? 'रंगशाला सिट हेर्नुहोस्' : 'Explore TU Stadium'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Entry 2: Cinemas */}
          <div
            id="cinemas-section"
            className="relative rounded-xl border border-white/10 overflow-hidden bg-[#12141c] p-6 sm:p-8 flex flex-col gap-6"
          >
            {/* Background 3D screenshot evenly darkened, with no UI chrome */}
            <div className="absolute inset-0 pointer-events-none">
              <img
                src="/landing/cinema-card-bg.jpg"
                alt="Cinema 3D Auditorium Canvas"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[#0a0b10]/85" />
            </div>

            {/* Header info */}
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#dc143c]">
                  {language === 'ne' ? 'अहिले प्रदर्शनमा' : 'Now Showing'}
                </span>
                <span className="text-white/20">•</span>
                <span className="text-xs text-slate-400">Kathmandu, Lalitpur & Banepa</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-display font-bold text-[#f1f5f9] mb-4">
                {language === 'ne' ? 'सिनेमा हलहरू' : 'Premier Cinema Chains'}
              </h3>

              {/* Now showing card with abstract geometric poster tile (NO real posters/stock photos) */}
              <div className="p-4 rounded-lg border border-white/10 bg-white/[0.04] flex items-center gap-4">
                {/* Abstract geometric poster tile */}
                <div className="w-20 h-28 rounded-lg bg-gradient-to-b from-[#181a24] to-[#0a0b10] border border-white/15 p-2 flex flex-col justify-between shrink-0 select-none">
                  <div className="w-full h-1 bg-[#dc143c] rounded" />
                  <div className="text-center">
                    <div className="w-6 h-6 mx-auto rounded-full border border-white/20 flex items-center justify-center text-[10px] text-slate-300 mb-1">
                      4K
                    </div>
                    <span className="text-[9px] font-bold text-slate-300 tracking-tighter block uppercase">
                      LALIT
                    </span>
                    <span className="text-[8px] text-[#dc143c] font-medium block">
                      MAYA
                    </span>
                  </div>
                  <div className="text-[7px] text-slate-500 text-center tracking-widest uppercase">
                    ATMOS
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-[#f1f5f9] leading-snug break-words">
                    Lalit Maya (ललित माया)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Romantic Drama • 2h 24m • 4K Dolby Atmos
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    QFX Civil Mall (Audi 1) • Today 06:30 PM
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400">from</span>
                    <span className="font-semibold text-amber-400">NPR 360</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button directly below event rows without empty gap */}
            <div className="relative z-10 pt-2 border-t border-white/10">
              <button
                onClick={() => scrollToSection('cinemas-table')}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#dc143c] hover:bg-[#b01030] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{language === 'ne' ? 'सिनेमा हलहरू हेर्नुहोस्' : 'Browse cinemas'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. CINEMAS COMPACT LIST / TABLE */}
      {/* ────────────────────────────────────────────────────────── */}
      <section id="cinemas-table" className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-20 sm:py-24">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-[-0.01em] text-[#f1f5f9] mb-2">
            {language === 'ne' ? 'सिनेमा हल तालिका' : 'Cinemas & Screens'}
          </h2>
          <p className="text-sm text-slate-400">
            {language === 'ne'
              ? 'आफ्नो नजिकको हल र पर्दा छानेर ३D सिट पूर्वावलोकन गर्नुहोस्।'
              : 'Compare screens, halls, and pricing across Kathmandu Valley.'}
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          {/* Chain filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setChainFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                chainFilter === 'all'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              {language === 'ne' ? 'सबै चेनहरू' : 'All Chains'}
            </button>
            {chains.map((chain) => (
              <button
                key={chain}
                onClick={() => setChainFilter(chain)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  chainFilter === chain
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                {chain}
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ne' ? 'हल वा स्थान खोज्नुहोस्...' : 'Search hall or area...'}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Compact Table (Scrolls horizontally at small viewport) */}
        <div className="rounded-xl border border-white/10 overflow-hidden bg-[#12141c]/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[560px] sm:min-w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold">Chain</th>
                  <th className="py-3 px-4 font-semibold">Hall / Screen</th>
                  <th className="py-3 px-4 font-semibold">Area / City</th>
                  <th className="py-3 px-4 font-semibold text-right">from NPR</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCinemas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      {language === 'ne' ? 'कुनै हल भेटिएन।' : 'No cinemas match your search.'}
                    </td>
                  </tr>
                ) : (
                  filteredCinemas.map((cinema) => {
                    const minPrice = Math.min(...cinema.sections.map((s) => s.priceNPR));
                    const matchedEvent = eventsData.find((e) => e.venueId === cinema.id) || eventsData[0];

                    return (
                      <tr
                        key={cinema.id}
                        className="hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-[#f1f5f9] whitespace-nowrap">
                          {cinema.chain || 'Independent'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {cinema.name[language]}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {cinema.location}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-amber-400 whitespace-nowrap">
                          NPR {minPrice}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => selectVenue(cinema.id, matchedEvent.id)}
                            className="text-xs text-[#dc143c] hover:text-[#ff4d6d] font-semibold transition-colors cursor-pointer"
                          >
                            {language === 'ne' ? 'सिट हेर्नुहोस् →' : 'View seats →'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. CLOSING CTA SECTION (Before Footer) */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="w-full border-t border-white/10 bg-[#0d0f17]">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-16 sm:py-20 flex flex-col items-center text-center">
          <p className="text-xl sm:text-2xl font-display font-semibold text-[#f1f5f9] mb-6 tracking-[-0.01em]">
            {language === 'ne' ? 'भुक्तानी गर्नुअघि आफ्नो सिट छान्नुहोस्।' : 'Pick your seat before you pay.'}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => scrollToSection('stadium-section')}
              className="w-full sm:w-auto text-center px-6 py-3 rounded-lg bg-[#dc143c] hover:bg-[#b01030] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {language === 'ne' ? 'खेल रोज्नुहोस्' : 'Choose a match'}
            </button>

            <button
              onClick={() => scrollToSection('cinemas-section')}
              className="w-full sm:w-auto text-center px-6 py-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-[#f1f5f9] text-sm font-semibold transition-colors cursor-pointer"
            >
              {language === 'ne' ? 'चलचित्र रोज्नुहोस्' : 'Choose a movie'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
