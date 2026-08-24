import React, { useState, useEffect } from 'react';
import { Bell, Compass, Info, Loader2, Map as MapIcon, Menu, MessagesSquare, Search, User, X } from 'lucide-react';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import type { SearchResultType } from './components/social/GlobalSearch';

const AuthOverlay = React.lazy(() => import('./components/auth/AuthOverlay').then((module) => ({ default: module.AuthOverlay })));
const WorldMap = React.lazy(() => import('./components/world/WorldMap').then((module) => ({ default: module.WorldMap })));
const Room = React.lazy(() => import('./components/world/Room').then((module) => ({ default: module.Room })));
const SocialFeed = React.lazy(() => import('./components/social/SocialFeed').then((module) => ({ default: module.SocialFeed })));
const Profile = React.lazy(() => import('./components/social/Profile').then((module) => ({ default: module.Profile })));
const Discovery = React.lazy(() => import('./components/social/Discovery').then((module) => ({ default: module.Discovery })));
const SupportHumanWorld = React.lazy(() => import('./components/meta/SupportHumanWorld').then((module) => ({ default: module.SupportHumanWorld })));
const GlobalSearch = React.lazy(() => import('./components/social/GlobalSearch').then((module) => ({ default: module.GlobalSearch })));
const Notifications = React.lazy(() => import('./components/social/Notifications').then((module) => ({ default: module.Notifications })));
const AvatarCustomizer = React.lazy(() => import('./components/social/AvatarCustomizer').then((module) => ({ default: module.AvatarCustomizer })));

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

  const handleEnterRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setCurrentView('ROOM');
  };

  const handleEnterWorld = (user: Exclude<CurrentUser, null>) => {
    setCurrentUser(user);
    setCurrentRoomId('central-plaza');
    setCurrentView('ROOM');
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setCurrentView('MAP');
  };

  useEffect(() => {
    const handler = () => setShowAvatarCustomizer(true);
    window.addEventListener('open-avatar-customizer', handler);
    return () => window.removeEventListener('open-avatar-customizer', handler);
  }, []);

  const handleOpenProfile = (username: string) => {
    setSelectedProfile(username);
  };

  const handleOpenSearch = () => {
    setShowMoreMenu(false);
    setShowSearch(true);
  };

  const handleOpenNotifications = () => {
    setShowMoreMenu(false);
    setShowNotifs(true);
  };

  const handleOpenOwnProfile = () => {
    setShowMoreMenu(false);
    setCurrentView('PROFILE');
  };

  const handleOpenSupport = () => {
    setShowMoreMenu(false);
    setCurrentView('SUPPORT');
  };

  const handleSearchSelect = (type: SearchResultType, id: string) => {
    setShowSearch(false);
    if (type === 'human') {
      handleOpenProfile(id);
      return;
    }
    handleEnterRoom(id);
  };

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <React.Suspense fallback={<LoadingSurface label="Opening Human World" fullscreen/>}>
          <AuthOverlay onSuccess={handleEnterWorld} />
        </React.Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-zinc-950 flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        <React.Suspense fallback={<LoadingSurface label="Loading this space"/>}>
          {currentView === 'MAP' && <WorldMap onEnterRoom={handleEnterRoom} currentUser={currentUser} />}
          {currentView === 'ROOM' && currentRoomId && (
            <Room roomId={currentRoomId} onLeave={handleLeaveRoom} onEnterRoom={handleEnterRoom} onOpenProfile={handleOpenProfile} />
          )}
          {currentView === 'FEED' && <SocialFeed onEnterRoom={handleEnterRoom} currentUser={currentUser} />}
          {currentView === 'DISCOVERY' && <Discovery onEnterRoom={handleEnterRoom} />}
          {currentView === 'SUPPORT' && <SupportHumanWorld />}
          {currentView === 'PROFILE' && <Profile username={currentUser.username} currentUserId={currentUser.id} />}
        </React.Suspense>

        {/* Modals */}
        <React.Suspense fallback={null}>
          {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} onSelect={handleSearchSelect} />}
          {showNotifs && <Notifications onClose={() => setShowNotifs(false)} />}

          {showAvatarCustomizer && currentUser && <AvatarCustomizer userId={currentUser.id} onClose={() => setShowAvatarCustomizer(false)} onSave={() => setShowAvatarCustomizer(false)} />}

          {/* Dynamic Profile Overlay */}
          {selectedProfile && (
            <Profile username={selectedProfile} onClose={() => setSelectedProfile(null)} currentUserId={currentUser.id} />
          )}
        </React.Suspense>

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
            onClick={() => setCurrentView('MAP')}
            compact={inRoom}
          />
          <NavItem
            icon={<MessagesSquare />}
            label="Feed"
            isActive={currentView === 'FEED'}
            onClick={() => setCurrentView('FEED')}
            compact={inRoom}
          />
          <NavItem
            icon={<Compass />}
            label="Discover"
            isActive={currentView === 'DISCOVERY'}
            onClick={() => setCurrentView('DISCOVERY')}
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
            onClick={() => setShowMoreMenu(true)}
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
            onClick={() => setCurrentView('MAP')}
            compact={inRoom}
          />
          <NavItem
            icon={<MessagesSquare />}
            label="Feed"
            isActive={currentView === 'FEED'}
            onClick={() => setCurrentView('FEED')}
            compact={inRoom}
          />
          <NavItem
            icon={<Compass />}
            label="Discover"
            isActive={currentView === 'DISCOVERY'}
            onClick={() => setCurrentView('DISCOVERY')}
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
    </ErrorBoundary>
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
    <div className="fixed inset-0 z-[70] flex items-end bg-black/55 backdrop-blur-sm sm:hidden" role="presentation" onMouseDown={onClose}>
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
