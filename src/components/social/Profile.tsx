import { ShieldCheck, Activity, MapPin, Building, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProfileService, ProfileData } from '../../services/ProfileService';

interface ProfileProps {
  username?: string;
  onClose?: () => void;
  currentUserId?: string; // Passed from context/App ideally, omitted for brevity but used for toggling follow
}

export function Profile({ username = "Citizen_0x89", onClose, currentUserId }: ProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const data = await ProfileService.getProfile(username);
      if (data) {
        setProfile(data);
        const fCount = await ProfileService.getFollowersCount(data.id);
        const followingCount = await ProfileService.getFollowingCount(data.id);
        setFollowers(fCount);
        setFollowing(followingCount);

        if (currentUserId && currentUserId !== data.id) {
          const followStatus = await ProfileService.checkIsFollowing(data.id);
          setIsFollowing(followStatus);
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [username, currentUserId]);

  const handleFollowToggle = async () => {
    if (!profile || !currentUserId) return;
    const success = await ProfileService.toggleFollow(profile.id, isFollowing);
    if (success) {
      setFollowers(prev => isFollowing ? prev - 1 : prev + 1);
      setIsFollowing(!isFollowing);
    }
  };

  if (loading) {
    return (
      <div className="absolute inset-0 bg-zinc-950 overflow-y-auto pt-safe pb-16 z-50 flex justify-center items-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Fallback to mock data if no DB profile is found for development
  const displayUsername = profile?.username || username;
  const displayBio = profile?.bio || "A new human in the World.";
  const displayXp = profile?.xp || 12;

  return (
    <div className="absolute inset-0 bg-zinc-950 overflow-y-auto pt-safe pb-16 z-50">
      <div className="max-w-md mx-auto p-4 pt-8 relative">

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-4 mt-4">
          <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shadow-xl relative overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayUsername} className="w-full h-full object-cover" />
            ) : (
              <>
                <div className="absolute inset-0 bg-blue-500/10" />
                <span className="text-3xl font-bold text-zinc-500">{displayUsername.charAt(0).toUpperCase()}</span>
              </>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{displayUsername}</h1>
            <div className="flex items-center gap-1.5 text-blue-400 text-sm font-medium mt-1 mb-2">
              <ShieldCheck size={16} />
              World ID Verified
            </div>
          </div>
        </div>

        {currentUserId && profile && currentUserId === profile.id && (
          <button onClick={() => window.dispatchEvent(new CustomEvent('open-avatar-customizer'))} className="w-full py-2 bg-zinc-800 text-white rounded-xl mb-6 hover:bg-zinc-700">Customize Avatar</button>
        )}

        <div className="text-zinc-300 text-sm mb-6">
          {displayBio}
        </div>

        <div className="flex gap-4 mb-6 text-sm">
          <div className="text-white"><span className="font-bold">{following}</span> <span className="text-zinc-500">Following</span></div>
          <div className="text-white"><span className="font-bold">{followers}</span> <span className="text-zinc-500">Followers</span></div>
        </div>

        {currentUserId && profile && currentUserId !== profile.id && (
          <button
            onClick={handleFollowToggle}
            className={`w-full py-2 rounded-full font-medium mb-8 transition-colors ${
              isFollowing
                ? 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">XP Level</div>
            <div className="text-2xl font-bold text-white">{displayXp}</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
            <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">HUM Balance</div>
            <div className="text-2xl font-bold text-white">450</div>
          </div>
        </div>

        {/* Assets Section */}
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Building size={18} />
          Owned Spaces
        </h2>
        <div className="space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-white font-medium">Plot #048192</h3>
              <p className="text-zinc-400 text-sm mb-2">District 4 • Studio Setup</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md w-fit">
                <Activity size={12} />
                High Activity
              </div>
            </div>
          </div>

          <button className="w-full py-4 border border-dashed border-zinc-700 rounded-2xl text-zinc-500 hover:text-white hover:border-zinc-500 hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
            + Acquire Property
          </button>
        </div>

      </div>
    </div>
  );
}
