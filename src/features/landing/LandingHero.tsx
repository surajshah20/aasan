import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useT } from '../../i18n/useT';
import { useBookingStore } from '../../store/useBookingStore';
import venuesData from '../../data/venues.json';
import eventsData from '../../data/events.json';
import { formatPrice } from '../../lib/money';
import { Venue } from '../../types';
import { 
  Trophy, 
  Film, 
  MapPin, 
  ArrowRight, 
  Sparkles, 
  Eye, 
  ChevronRight,
  Tv
} from 'lucide-react';

export const LandingHero: React.FC = () => {
  const { t, language } = useT();
  const { selectVenue } = useBookingStore();
  const [activeTab, setActiveTab] = useState<'all' | 'stadium' | 'cinema'>('all');
  const [selectedChainFilter, setSelectedChainFilter] = useState<string>('all');

  const venues = venuesData as unknown as Venue[];
  const stadiumVenue = venues.find((v) => v.type === 'stadium');
  const cinemaVenues = venues.filter((v) => v.type === 'cinema');

  // Chains available
  const chains = Array.from(new Set(cinemaVenues.map((c) => c.chain).filter(Boolean))) as string[];

  const filteredCinemas = selectedChainFilter === 'all'
    ? cinemaVenues
    : cinemaVenues.filter((c) => c.chain === selectedChainFilter);

  return (
    <div className="relative min-h-[calc(100vh-65px)] flex flex-col justify-between overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] left-[10%] w-[500px] h-[500px] rounded-full bg-crimson/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-[25%] right-[5%] w-[450px] h-[450px] rounded-full bg-nepalblue/20 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[300px] rounded-full bg-crimson/10 blur-[130px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-10 pb-16 z-10">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-white/5 border border-white/10 text-xs text-text/80 mb-6 shadow-glow-subtle">
            <Sparkles className="w-3.5 h-3.5 text-crimson animate-pulse" />
            <span className="font-medium tracking-wide">
              {language === 'ne' ? '३D सिट-भ्यू टिकेटिङ प्रणाली' : 'Next-Gen 3D Seat Preview Platform'}
            </span>
          </div>

          {/* Headline in Dual Language */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white leading-[1.15] mb-4">
            {language === 'ne' ? (
              <>
                आफ्नै <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson via-red-400 to-amber-300">आँखाको कोणबाट</span> सिट छान्नुहोस्।
              </>
            ) : (
              <>
                Choose your seat with a <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson via-red-400 to-amber-300">real perspective</span>.
              </>
            )}
          </h1>

          <p className="text-base sm:text-lg text-muted font-normal max-w-2xl mx-auto leading-relaxed">
            {t('hero_subtitle')}
          </p>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-pill text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-bg shadow-lg shadow-white/10'
                  : 'bg-white/5 text-muted hover:text-white hover:bg-white/10'
              }`}
            >
              {language === 'ne' ? 'सबै भेन्युहरू' : 'All Venues'}
            </button>
            <button
              onClick={() => setActiveTab('stadium')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-pill text-xs font-semibold transition-all ${
                activeTab === 'stadium'
                  ? 'bg-crimson text-white shadow-glow-crimson'
                  : 'bg-white/5 text-muted hover:text-white hover:bg-white/10'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{t('explore_matches')}</span>
            </button>
            <button
              onClick={() => setActiveTab('cinema')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-pill text-xs font-semibold transition-all ${
                activeTab === 'cinema'
                  ? 'bg-nepalblue text-white shadow-glow-blue'
                  : 'bg-white/5 text-muted hover:text-white hover:bg-white/10'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>{t('explore_cinemas')}</span>
            </button>
          </div>
        </motion.div>

        {/* Two Grand Venue Entry Cards (Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-14">
          {/* Card 1: Matches & Events (TU Stadium) */}
          {(activeTab === 'all' || activeTab === 'stadium') && stadiumVenue && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -4 }}
              onClick={() => selectVenue(stadiumVenue.id, 'event_tu_cricket_1')}
              className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-surface-elevated to-surface border border-white/10 hover:border-crimson/50 p-6 sm:p-8 overflow-hidden transition-all duration-300 shadow-xl hover:shadow-glow-crimson"
            >
              {/* Subtle Stadium Light Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/10 rounded-full blur-3xl pointer-events-none group-hover:bg-crimson/20 transition-colors" />

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-crimson/15 border border-crimson/30 text-crimson text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{t('explore_matches')}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted font-medium bg-black/40 px-3 py-1.5 rounded-pill border border-white/5">
                  <Eye className="w-3.5 h-3.5 text-crimson" />
                  <span>3D Pitch Fly-in</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 group-hover:text-red-200 transition-colors">
                {stadiumVenue.name[language]}
              </h2>

              <div className="flex items-center gap-2 text-muted text-xs sm:text-sm mb-4">
                <MapPin className="w-4 h-4 text-crimson shrink-0" />
                <span>{stadiumVenue.location}</span>
              </div>

              <p className="text-muted/90 text-sm leading-relaxed mb-6">
                {stadiumVenue.description[language]}
              </p>

              {/* Sample Upcoming Events */}
              <div className="space-y-2.5 mb-6 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    <div>
                      <p className="text-xs font-semibold text-text">
                        {language === 'ne' ? 'नेपाल विरुद्ध नेदरल्यान्ड्स (टी-२०)' : 'Nepal vs Netherlands (T20 Final)'}
                      </p>
                      <p className="text-[11px] text-muted">28 Nov • 01:15 PM</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    {language === 'ne' ? 'रू ५०० बाट' : 'from NPR 500'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <div>
                      <p className="text-xs font-semibold text-text">
                        {language === 'ne' ? '१९७४ एडी — ३० वर्षे साङ्गीतिक यात्रा' : '1974 AD — 30 Yrs Live Concert'}
                      </p>
                      <p className="text-[11px] text-muted">05 Dec • 05:00 PM</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">
                    {language === 'ne' ? 'रू ७५० बाट' : 'from NPR 750'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted">
                  5 Stands • VIP Pavilion • Upper/Lower Tiers
                </span>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-crimson hover:bg-crimson-dark text-white text-xs font-semibold shadow-md group-hover:translate-x-1 transition-all">
                  <span>{t('view_seats')}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Card 2: Cinemas & Halls (Signature QFX Civil Mall Featured) */}
          {(activeTab === 'all' || activeTab === 'cinema') && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ y: -4 }}
              onClick={() => selectVenue('qfx_civil_audi1', 'event_qfx_movie_1')}
              className="group relative cursor-pointer rounded-2xl bg-gradient-to-b from-surface-elevated to-surface border border-white/10 hover:border-nepalblue/60 p-6 sm:p-8 overflow-hidden transition-all duration-300 shadow-xl hover:shadow-glow-blue"
            >
              {/* Subtle Cinema Light Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-nepalblue/15 rounded-full blur-3xl pointer-events-none group-hover:bg-nepalblue/30 transition-colors" />

              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-nepalblue/20 border border-nepalblue/40 text-sky-400 text-xs font-semibold">
                  <Film className="w-3.5 h-3.5" />
                  <span>{t('explore_cinemas')}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted font-medium bg-black/40 px-3 py-1.5 rounded-pill border border-white/5">
                  <Tv className="w-3.5 h-3.5 text-sky-400" />
                  <span>Dolby Atmos 4K</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 group-hover:text-sky-200 transition-colors">
                {venues.find(v => v.id === 'qfx_civil_audi1')?.name[language]}
              </h2>

              <div className="flex items-center gap-2 text-muted text-xs sm:text-sm mb-4">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Sundhara, Kathmandu</span>
              </div>

              <p className="text-muted/90 text-sm leading-relaxed mb-6">
                {venues.find(v => v.id === 'qfx_civil_audi1')?.description[language]}
              </p>

              {/* Movie Screening Feature Preview */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-muted font-bold">
                    {language === 'ne' ? 'अब प्रदर्शन हुँदै' : 'NOW SHOWING'}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {formatPrice(360, language)} {t('from_price')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-text">
                      {language === 'ne' ? 'ललित माया (Lalit Maya)' : 'Lalit Maya (Romantic Drama)'}
                    </p>
                    <p className="text-xs text-muted">Today • 06:30 PM • Audi 1</p>
                  </div>
                  <div className="text-[11px] px-2.5 py-1 rounded bg-white/5 border border-white/10 text-text/90 font-medium">
                    Recliner • Club
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted">
                  Royal Recliners • Prime Club • Classic
                </span>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-nepalblue hover:bg-blue-800 text-white text-xs font-semibold shadow-md group-hover:translate-x-1 transition-all">
                  <span>{t('view_seats')}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* All Cinema Halls Directory (Grouped by Chain) */}
        <div className="mt-8 pt-10 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-display font-bold text-white">
                {t('cinemas_title')}
              </h3>
              <p className="text-xs sm:text-sm text-muted">
                {language === 'ne' 
                  ? 'आफ्नो मनपर्ने हल र स्क्रिन छान्नुहोस्' 
                  : 'Select your preferred cinema chain, screen and showtime'}
              </p>
            </div>

            {/* Plain text chain filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedChainFilter('all')}
                className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-all ${
                  selectedChainFilter === 'all'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-muted hover:text-white'
                }`}
              >
                All Chains
              </button>
              {chains.map((chain) => (
                <button
                  key={chain}
                  onClick={() => setSelectedChainFilter(chain)}
                  className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-all ${
                    selectedChainFilter === chain
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-muted hover:text-white'
                  }`}
                >
                  {chain}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Cinema Halls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCinemas.map((cinema) => {
              const matchedEvent = eventsData.find((e) => e.venueId === cinema.id) || eventsData[0];
              const minPrice = Math.min(...cinema.sections.map((s) => s.priceNPR));

              return (
                <div
                  key={cinema.id}
                  onClick={() => selectVenue(cinema.id, matchedEvent.id)}
                  className="p-4 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-white/5 hover:border-white/20 cursor-pointer transition-all hover:-translate-y-1 group"
                >
                  <div className="flex items-center justify-between text-xs text-muted mb-2">
                    <span className="font-semibold text-sky-400">{cinema.chain}</span>
                    <span>{cinema.city}</span>
                  </div>
                  <h4 className="font-bold text-sm text-white mb-1 group-hover:text-crimson transition-colors line-clamp-1">
                    {cinema.name[language]}
                  </h4>
                  <p className="text-xs text-muted mb-3 line-clamp-1">
                    {matchedEvent.title[language]}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className="text-text/80 font-medium">
                      {formatPrice(minPrice, language)}
                    </span>
                    <span className="text-muted flex items-center gap-1 group-hover:text-white">
                      <span>{t('view_seats')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
