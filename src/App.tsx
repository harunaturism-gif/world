import React, { useCallback, useState, useEffect } from 'react';
import { Bell, Compass, Info, Loader2, Map as MapIcon, Menu, MessagesSquare, Search, User, X } from 'lucide-react';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import type { SearchResultType } from './components/social/GlobalSearch';
import { lazyWithRetry } from './lib/lazyWithRetry';

const AuthOverlay = lazyWithRetry('auth-overlay', () => import('./components/auth/AuthOverlay').then((module) => ({ default: module.AuthOverlay })));
const WorldMap = lazyWithRetry('world-map', () => import('./components/world/WorldMap').then((module) => ({ default: module.WorldMap })));
const loadRoomModule = () => import('./components/world/Room');
const loadRoomEngineModule = () => import('./components/world/CentralPlazaEngine');
const Room = lazyWithRetry('room', () => loadRoomModule().then((module) => ({ default: module.Room })));
const SocialFeed = lazyWithRetry('social-feed', () => import('./components/social/SocialFeed').then((module) => ({ default: module.SocialFeed })));
const Profile = lazyWithRetry('profile', () => import('./components/social/Profile').then((module) => ({ default: module.Profile })));
const Discovery = lazyWithRetry('discovery', () => import('./components/social/Discovery').then((module) => ({ default: module.Discovery })));
const SupportHumanWorld = lazyWithRetry('support', () => import('./components/meta/SupportHumanWorld').then((module) => ({ default: module.SupportHumanWorld })));
const GlobalSearch = lazyWithRetry('global-search', () => import('./components/social/GlobalSearch').then((module) => ({ default: module.GlobalSearch })));
const Notifications = lazyWithRetry('notifications', () => import('./components/social/Notifications').then((module) => ({ default: module.Notifications })));
const AvatarCustomizer = lazyWithRetry('avatar-customizer', () => import('./components/social/AvatarCustomizer').then((module) => ({ default: module.AvatarCustomizer })));

function preloadRoomExperience() {
  void Promise.allSettled([loadRoomModule(), loadRoomEngineModule()]);
}

type ViewState = 'MAP' | 'ROOM' | 'FEED' | 'PROFILE' | 'DISCOVERY' | 'SUPPORT';

export type CurrentUser = {
  id: string;
  username: string;
} | null;

function LoadingSurface({ label, fullscreen = false }: { label: string; fullscreen?: boolean }) {
  return (
    <div className={`${fullscreen ? 'fixed' : 'absolute'} inset-0 z-50 grid place-items-center bg-[#10142c] text-white`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="animate-spin text-cyan-300" size={30}/>
        <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-100/75">{label}</p>
      </div>
    </div>
  );
}

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('MAP');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const inRoom = currentView === 'ROOM';

  const closeOverlays = useCallback(() => {
    setSelectedProfile(null);
    setShowSearch(false);
    setShowNotifs(false);
    setShowAvatarCustomizer(false);
    setShowMoreMenu(false);
  }, []);

  const navigateTo = (view: ViewState) => {
    closeOverlays();
    setCurrentView(view);
  };

  const handleEnterRoom = (roomId: string) => {
    closeOverlays();
    preloadRoomExperience();
    setCurrentRoomId(roomId);
    setCurrentView('ROOM');
  };

  const handleEnterWorld = (user: Exclude<CurrentUser, null>) => {
    preloadRoomExperience();
    setCurrentUser(user);
    setCurrentRoomId('central-plaza');
    setCurrentView('ROOM');
  };

  const handleLeaveRoom = () => {
    closeOverlays();
    setCurrentRoomId(null);
    setCurrentView('MAP');
  };

  useEffect(() => {
    const handler = () => {
      closeOverlays();
      setShowAvatarCustomizer(true);
    };
    window.addEventListener('open-avatar-customizer', handler);
    return () => window.removeEventListener('open-avatar-customizer', handler);
  }, [closeOverlays]);

  const handleOpenProfile = (username: string) => {
    closeOverlays();
    setSelectedProfile(username);
  };

  const handleOpenSearch = () => {
    closeOverlays();
    setShowSearch(true);
  };

  const handleOpenNotifications = () => {
    closeOverlays();
    setShowNotifs(true);
  };

  const handleOpenOwnProfile = () => {
    navigateTo('PROFILE');
  };

  const handleOpenSupport = () => {
    navigateTo('SUPPORT');
  };

  const handleOpenMore = () => {
    closeOverlays();
    setShowMoreMenu(true);
  };

  const handleSearchSelect = (type: SearchResultType, id: string) => {
    setShowSearch(false);
    if (type === 'human') {
      handleOpenProfile(id);
      return;
    }
    handleEnterRoom(id);
  };

  const recoverToWorld = () => {
    setCurrentRoomId(null);
    closeOverlays();
    setCurrentView('MAP');
  };

  const overlayKey = showSearch
    ? 'search'
    : showNotifs
      ? 'notifications'
      : showAvatarCustomizer
        ? 'avatar-customizer'
        : selectedProfile
          ? `profile:${selectedProfile}`
          : null;

  if (!currentUser) {
    return (
      <React.Suspense fallback={<LoadingSurface label="Opening Human World" fullscreen/>}>
        <AuthOverlay onSuccess={handleEnterWorld} />
      </React.Suspense>
    );
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        <ErrorBoundary
          key={`${currentView}:${currentRoomId ?? 'none'}`}
          title="This space could not open"
          message="Your identity and session remain safe. Try this area again or return to the World map."
          onExit={recoverToWorld}
        >
          <React.Suspense fallback={<LoadingSurface label="Loading this space"/>}>
            {currentView === 'MAP' && <WorldMap onEnterRoom={handleEnterRoom} currentUser={currentUser} />}
            {currentView === 'ROOM' && currentRoomId && (
              <Room key={currentRoomId} roomId={currentRoomId} onLeave={handleLeaveRoom} onEnterRoom={handleEnterRoom} onOpenProfile={handleOpenProfile} />
            )}
            {currentView === 'FEED' && <SocialFeed onEnterRoom={handleEnterRoom} currentUser={currentUser} />}
            {currentView === 'DISCOVERY' && <Discovery onEnterRoom={handleEnterRoom} />}
            {currentView === 'SUPPORT' && <SupportHumanWorld />}
            {currentView === 'PROFILE' && <Profile isOwnProfile username={currentUser.username} currentUserId={currentUser.id} />}
          </React.Suspense>
        </ErrorBoundary>

        {/* Modals */}
        {overlayKey ? (
          <ErrorBoundary
            key={overlayKey}
            title="This panel could not open"
            message="The rest of Human World is still available. Try the panel again or return to the World map."
            onExit={recoverToWorld}
          >
            <React.Suspense fallback={<LoadingSurface label="Opening panel"/>}>
              {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} onSelect={handleSearchSelect} />}
              {showNotifs && <Notifications onClose={() => setShowNotifs(false)} />}

              {showAvatarCustomizer && currentUser && <AvatarCustomizer userId={currentUser.id} onClose={() => setShowAvatarCustomizer(false)} onSave={() => setShowAvatarCustomizer(false)} />}

              {/* Dynamic Profile Overlay */}
              {selectedProfile && (
                <Profile username={selectedProfile} onClose={() => setSelectedProfile(null)} currentUserId={currentUser.id} />
              )}
            </React.Suspense>
          </ErrorBoundary>
        ) : null}

        {showMoreMenu && (
          <MoreMenu
            onClose={() => setShowMoreMenu(false)}
            onSearch={handleOpenSearch}
            onNotifications={handleOpenNotifications}
            onProfile={handleOpenOwnProfile}
            onSupport={handleOpenSupport}
          />
        )}
      </main>

      {/* Mobile-Friendly Bottom Navigation */}
      <nav className={`z-40 border-t pb-safe backdrop-blur-xl ${inRoom ? 'border-amber-100/10 bg-[#0b1b21]/94 shadow-[0_-14px_36px_rgba(5,20,25,.3)]' : 'border-zinc-800 bg-zinc-900'}`}>
        <div className={`grid grid-cols-5 px-1 sm:hidden ${inRoom ? 'h-14' : 'h-16'}`}>
          <NavItem
            icon={<MapIcon />}
            label="World"
            isActive={currentView === 'MAP' || inRoom}
            onClick={() => navigateTo('MAP')}
            compact={inRoom}
          />
          <NavItem
            icon={<MessagesSquare />}
            label="Feed"
            isActive={currentView === 'FEED'}
            onClick={() => navigateTo('FEED')}
            compact={inRoom}
          />
          <NavItem
            icon={<Compass />}
            label="Discover"
            isActive={currentView === 'DISCOVERY'}
            onClick={() => navigateTo('DISCOVERY')}
            compact={inRoom}
          />
          <NavItem
            icon={<User />}
            label="Profile"
            isActive={currentView === 'PROFILE'}
            onClick={handleOpenOwnProfile}
            compact={inRoom}
          />
          <NavItem
            icon={<Menu />}
            label="More"
            isActive={showMoreMenu || showSearch || showNotifs || currentView === 'SUPPORT'}
            onClick={handleOpenMore}
            compact={inRoom}
          />
        </div>

        <div className={`hidden items-center justify-around px-4 sm:flex ${inRoom ? 'h-14' : 'h-16'}`}>
          <NavItem
            icon={<Search />}
            label="Search"
            isActive={showSearch}
            onClick={handleOpenSearch}
            compact={inRoom}
          />
          <NavItem
            icon={<Bell />}
            label="Alerts"
            isActive={showNotifs}
            onClick={handleOpenNotifications}
            compact={inRoom}
          />
          <NavItem
            icon={<MapIcon />}
            label="World"
            isActive={currentView === 'MAP' || inRoom}
            onClick={() => navigateTo('MAP')}
            compact={inRoom}
          />
          <NavItem
            icon={<MessagesSquare />}
            label="Feed"
            isActive={currentView === 'FEED'}
            onClick={() => navigateTo('FEED')}
            compact={inRoom}
          />
          <NavItem
            icon={<Compass />}
            label="Discover"
            isActive={currentView === 'DISCOVERY'}
            onClick={() => navigateTo('DISCOVERY')}
            compact={inRoom}
          />
          <NavItem
            icon={<User />}
            label="Profile"
            isActive={currentView === 'PROFILE'}
            onClick={handleOpenOwnProfile}
            compact={inRoom}
          />
          <NavItem
            icon={<Info />}
            label="Meta"
            isActive={currentView === 'SUPPORT'}
            onClick={handleOpenSupport}
            compact={inRoom}
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick, compact = false }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`flex h-full w-full flex-col items-center justify-center rounded-xl transition-colors sm:w-16 ${
        isActive ? (compact ? 'text-amber-200' : 'text-blue-500') : (compact ? 'text-white/42 hover:bg-white/5 hover:text-white/75' : 'text-zinc-500 hover:text-zinc-300')
      }`}
    >
      <div className={compact ? 'mb-0.5' : 'mb-1'}>{React.cloneElement(icon as React.ReactElement, { size: compact ? 18 : 20 })}</div>
      <span className={`${compact ? 'text-[8px] font-bold uppercase tracking-wide' : 'text-[10px] font-medium'}`}>{label}</span>
    </button>
  );
}

function MoreMenu({ onClose, onSearch, onNotifications, onProfile, onSupport }: {
  onClose: () => void;
  onSearch: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  onSupport: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const actions = [
    { label: 'Search world', description: 'Find spaces and events', icon: <Search size={21}/>, onClick: onSearch },
    { label: 'Notifications', description: 'See recent activity', icon: <Bell size={21}/>, onClick: onNotifications },
    { label: 'Your profile', description: 'View your identity', icon: <User size={21}/>, onClick: onProfile },
    { label: 'About & support', description: 'Learn about Human World', icon: <Info size={21}/>, onClick: onSupport },
  ];

  return (
    <div className="fixed inset-0 flex items-end bg-black/55 backdrop-blur-sm sm:hidden" role="presentation" style={{ zIndex: 70 }} onMouseDown={onClose}>
      <section
        aria-labelledby="more-menu-title"
        aria-modal="true"
        className="w-full rounded-t-[28px] border-t border-white/10 bg-zinc-950 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 text-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-3 flex items-center justify-between px-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300/75">Human World</p>
            <h2 id="more-menu-title" className="text-lg font-black">More</h2>
          </div>
          <button autoFocus type="button" onClick={onClose} aria-label="Close menu" className="grid h-10 w-10 place-items-center rounded-full bg-white/[.08] text-white/70 hover:bg-white/[.12] hover:text-white">
            <X size={20}/>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              type="button"
              key={action.label}
              onClick={action.onClick}
              className="flex min-h-24 flex-col items-start justify-between rounded-2xl border border-white/8 bg-white/[.045] p-4 text-left transition hover:border-cyan-300/25 hover:bg-white/[.075] active:scale-[.98]"
            >
              <span className="text-cyan-200">{action.icon}</span>
              <span>
                <span className="block text-sm font-extrabold">{action.label}</span>
                <span className="mt-0.5 block text-[11px] leading-tight text-white/45">{action.description}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
