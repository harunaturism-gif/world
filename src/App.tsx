import React, { useState, useEffect } from 'react';
import { Compass, User, Map as MapIcon } from 'lucide-react';
import { WorldMap } from './components/world/WorldMap';
import { Room } from './components/world/Room';
import { SocialFeed } from './components/social/SocialFeed';
import { Profile } from './components/social/Profile';
import { Discovery } from './components/social/Discovery';
import { SupportHumanWorld } from './components/meta/SupportHumanWorld';
import { GlobalSearch } from './components/social/GlobalSearch';
import { Notifications } from './components/social/Notifications';
import { AvatarCustomizer } from './components/social/AvatarCustomizer';
import { Search, Bell } from 'lucide-react';
import { Info } from 'lucide-react';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { AuthOverlay } from './components/auth/AuthOverlay';

type ViewState = 'MAP' | 'ROOM' | 'FEED' | 'PROFILE' | 'DISCOVERY' | 'SUPPORT';

export type CurrentUser = {
  id: string;
  username: string;
} | null;

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('MAP');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
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

  if (!currentUser) {
    return <AuthOverlay onSuccess={handleEnterWorld} />;
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-zinc-950 flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {currentView === 'MAP' && <WorldMap onEnterRoom={handleEnterRoom} currentUser={currentUser} />}
        {currentView === 'ROOM' && currentRoomId && (
          <Room roomId={currentRoomId} onLeave={handleLeaveRoom} onEnterRoom={handleEnterRoom} onOpenProfile={handleOpenProfile} />
        )}
        {currentView === 'FEED' && <SocialFeed onEnterRoom={handleEnterRoom} currentUser={currentUser} />}
        {currentView === 'DISCOVERY' && <Discovery onEnterRoom={handleEnterRoom} />}
        {currentView === 'SUPPORT' && <SupportHumanWorld />}
        {currentView === 'PROFILE' && <Profile username={currentUser.username} currentUserId={currentUser.id} />}

        {/* Modals */}
        {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} onSelect={(t, id) => { setShowSearch(false); if (t==='room') handleEnterRoom(id); else if (t==='human') handleOpenProfile(id); }} />}
        {showNotifs && <Notifications onClose={() => setShowNotifs(false)} />}

        {showAvatarCustomizer && currentUser && <AvatarCustomizer userId={currentUser.id} onClose={() => setShowAvatarCustomizer(false)} onSave={() => setShowAvatarCustomizer(false)} />}

        {/* Dynamic Profile Overlay */}
        {selectedProfile && (
          <Profile username={selectedProfile} onClose={() => setSelectedProfile(null)} currentUserId={currentUser.id} />
        )}
      </main>

      {/* Mobile-Friendly Bottom Navigation */}
      <nav className={`z-40 border-t pb-safe backdrop-blur-xl ${inRoom ? 'border-amber-100/10 bg-[#0b1b21]/94 shadow-[0_-14px_36px_rgba(5,20,25,.3)]' : 'border-zinc-800 bg-zinc-900'}`}>
        <div className={`flex items-center justify-around px-2 sm:px-4 ${inRoom ? 'h-14' : 'h-16'}`}>
          <NavItem
            icon={<Search />}
            label="Search"
            isActive={showSearch}
            onClick={() => setShowSearch(true)}
            compact={inRoom}
          />
          <NavItem
            icon={<Bell />}
            label="Alerts"
            isActive={showNotifs}
            onClick={() => setShowNotifs(true)}
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
            icon={<Compass />}
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
            onClick={() => setCurrentView('PROFILE')}
            compact={inRoom}
          />
          <NavItem
            icon={<Info />}
            label="Meta"
            isActive={currentView === 'SUPPORT'}
            onClick={() => setCurrentView('SUPPORT')}
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
      onClick={onClick}
      aria-label={label}
      className={`flex h-full flex-col items-center justify-center rounded-xl transition-colors ${compact ? 'w-12 sm:w-14' : 'w-16'} ${
        isActive ? (compact ? 'text-amber-200' : 'text-blue-500') : (compact ? 'text-white/42 hover:bg-white/5 hover:text-white/75' : 'text-zinc-500 hover:text-zinc-300')
      }`}
    >
      <div className={compact ? 'mb-0.5' : 'mb-1'}>{React.cloneElement(icon as React.ReactElement, { size: compact ? 18 : 20 })}</div>
      <span className={`${compact ? 'text-[8px] font-bold uppercase tracking-wide' : 'text-[10px] font-medium'}`}>{label}</span>
    </button>
  );
}

export default App;
