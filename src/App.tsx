import React, { useState } from 'react';
import { Compass, User, Map as MapIcon } from 'lucide-react';
import { WorldMap } from './components/world/WorldMap';
import { Room } from './components/world/Room';
import { SocialFeed } from './components/social/SocialFeed';
import { Profile } from './components/social/Profile';
import { AuthOverlay } from './components/auth/AuthOverlay';

type ViewState = 'MAP' | 'ROOM' | 'FEED' | 'PROFILE';

export type CurrentUser = {
  id: string;
  username: string;
} | null;

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('MAP');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  const handleEnterRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setCurrentView('ROOM');
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setCurrentView('MAP');
  };

  const handleOpenProfile = (username: string) => {
    setSelectedProfile(username);
  };

  if (!currentUser) {
    return <AuthOverlay onSuccess={setCurrentUser} />;
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {currentView === 'MAP' && <WorldMap onEnterRoom={handleEnterRoom} currentUser={currentUser} />}
        {currentView === 'ROOM' && currentRoomId && (
          <Room roomId={currentRoomId} onLeave={handleLeaveRoom} onOpenProfile={handleOpenProfile} />
        )}
        {currentView === 'FEED' && <SocialFeed onEnterRoom={handleEnterRoom} currentUser={currentUser} />}
        {currentView === 'PROFILE' && <Profile username={currentUser.username} currentUserId={currentUser.id} />}

        {/* Dynamic Profile Overlay */}
        {selectedProfile && (
          <Profile username={selectedProfile} onClose={() => setSelectedProfile(null)} currentUserId={currentUser.id} />
        )}
      </main>

      {/* Mobile-Friendly Bottom Navigation */}
      <nav className="bg-zinc-900 border-t border-zinc-800 pb-safe z-10">
        <div className="flex justify-around items-center h-16 px-4">
          <NavItem
            icon={<MapIcon />}
            label="World"
            isActive={currentView === 'MAP'}
            onClick={() => setCurrentView('MAP')}
          />
          <NavItem
            icon={<Compass />}
            label="Discover"
            isActive={currentView === 'FEED'}
            onClick={() => setCurrentView('FEED')}
          />
          <NavItem
            icon={<User />}
            label="Profile"
            isActive={currentView === 'PROFILE'}
            onClick={() => setCurrentView('PROFILE')}
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
        isActive ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <div className="mb-1">{React.cloneElement(icon as React.ReactElement, { size: 20 })}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default App;
