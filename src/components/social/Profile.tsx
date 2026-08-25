import { Building2, Loader2, RefreshCw, ShieldCheck, Sparkles, UserPlus, UserRoundCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ProfileService } from '../../services/ProfileService';
import type { ProfileData } from '../../services/ProfileService';

interface ProfileProps {
  username?: string;
  onClose?: () => void;
  currentUserId?: string;
  isOwnProfile?: boolean;
}

type ProfileStatus = 'error' | 'loading' | 'ready';

function ProfileSurface({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-zinc-950 pb-16 pt-safe text-white">
      <div className="relative mx-auto max-w-md p-4 pt-8">
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close profile" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
            <X aria-hidden="true" size={20}/>
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function Profile({ username = 'Citizen_0x89', onClose, currentUserId, isOwnProfile = false }: ProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [reloadToken, setReloadToken] = useState(0);
  const [followPending, setFollowPending] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setFollowError(null);

    async function loadProfile() {
      try {
        const data = await ProfileService.getProfile(username);
        if (!data) throw new Error('Profile missing');

        const viewingOwnProfile = isOwnProfile || currentUserId === data.id;
        const [followersCount, followingCount, followStatus] = await Promise.all([
          ProfileService.getFollowersCount(data.id),
          ProfileService.getFollowingCount(data.id),
          currentUserId && !viewingOwnProfile
            ? ProfileService.checkIsFollowing(data.id)
            : Promise.resolve(false),
        ]);

        if (!active) return;
        setProfile(data);
        setFollowers(followersCount);
        setFollowing(followingCount);
        setIsFollowing(followStatus);
        setStatus('ready');
      } catch {
        if (!active) return;
        setStatus('error');
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [currentUserId, isOwnProfile, reloadToken, username]);

  const handleFollowToggle = async () => {
    if (!profile || !currentUserId || followPending) return;

    setFollowPending(true);
    setFollowError(null);
    try {
      const success = await ProfileService.toggleFollow(profile.id, isFollowing);
      if (!success) throw new Error('Follow rejected');

      setFollowers((current) => isFollowing ? Math.max(0, current - 1) : current + 1);
      setIsFollowing((current) => !current);
    } catch {
      setFollowError('That connection could not be updated. Please try again.');
    } finally {
      setFollowPending(false);
    }
  };

  if (status === 'loading') {
    return (
      <ProfileSurface onClose={onClose}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-zinc-400" role="status">
          <Loader2 aria-hidden="true" className="mb-3 animate-spin text-cyan-300" size={26}/>
          <p className="text-sm">Loading profile…</p>
        </div>
      </ProfileSurface>
    );
  }

  if (status === 'error' || !profile) {
    return (
      <ProfileSurface onClose={onClose}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="font-semibold text-zinc-200">This profile could not load.</p>
          <p className="mt-1 text-sm text-zinc-500">Check your connection and try again.</p>
          <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
            <RefreshCw aria-hidden="true" size={15}/>
            Retry
          </button>
        </div>
      </ProfileSurface>
    );
  }

  const viewingOwnProfile = isOwnProfile || currentUserId === profile.id;
  const displayBio = profile.bio?.trim() || 'A new human in the World.';

  return (
    <ProfileSurface onClose={onClose}>
      <header className="mb-5 mt-4 flex items-center gap-4 pr-10">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800 shadow-xl">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={`${profile.username}'s avatar`} className="h-full w-full object-cover" />
          ) : (
            <>
              <div aria-hidden="true" className="absolute inset-0 bg-blue-500/10" />
              <span aria-hidden="true" className="text-3xl font-bold text-zinc-500">{profile.username.charAt(0).toUpperCase()}</span>
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-300/65">Human profile</p>
          <h1 className="truncate text-2xl font-bold tracking-tight text-white">{profile.username}</h1>
          {profile.verification_status ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-blue-400">
              <ShieldCheck aria-hidden="true" size={16}/>
              World ID verified
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Verification pending</p>
          )}
        </div>
      </header>

      {viewingOwnProfile ? (
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-avatar-customizer'))} className="mb-6 w-full rounded-xl bg-zinc-800 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700">
          Customize avatar
        </button>
      ) : null}

      <p className="mb-5 text-sm leading-relaxed text-zinc-300">{displayBio}</p>

      <dl className="mb-6 flex gap-5 text-sm">
        <div className="text-white"><dt className="inline text-zinc-500">Following </dt><dd className="inline font-bold">{following}</dd></div>
        <div className="text-white"><dt className="inline text-zinc-500">Followers </dt><dd className="inline font-bold">{followers}</dd></div>
      </dl>

      {!viewingOwnProfile && currentUserId ? (
        <div className="mb-8">
          <button
            type="button"
            aria-pressed={isFollowing}
            disabled={followPending}
            onClick={handleFollowToggle}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-wait disabled:opacity-65 ${isFollowing ? 'border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-white text-black hover:bg-zinc-200'}`}
          >
            {followPending ? <Loader2 aria-hidden="true" className="animate-spin" size={17}/> : isFollowing ? <UserRoundCheck aria-hidden="true" size={17}/> : <UserPlus aria-hidden="true" size={17}/>}
            {followPending ? 'Updating…' : isFollowing ? 'Following' : 'Follow'}
          </button>
          <div aria-live="polite" className="min-h-5 pt-2 text-center text-xs text-rose-300">{followError}</div>
        </div>
      ) : null}

      <section aria-label="Profile progress" className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">Level</p>
          <p className="text-2xl font-bold text-white">{profile.level ?? 1}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">Experience</p>
          <p className="text-2xl font-bold text-white">{profile.xp ?? 0} <span className="text-xs font-medium text-zinc-500">XP</span></p>
        </div>
      </section>

      <section aria-labelledby="owned-spaces-title">
        <h2 id="owned-spaces-title" className="mb-4 flex items-center gap-2 font-semibold text-white">
          <Building2 aria-hidden="true" size={18}/>
          Owned spaces
        </h2>
        <div className="rounded-2xl border border-dashed border-zinc-800 px-5 py-9 text-center">
          <Sparkles aria-hidden="true" className="mx-auto mb-3 text-zinc-700" size={24}/>
          <p className="text-sm font-semibold text-zinc-400">No owned spaces yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-zinc-600">Verified ownership will appear here when persistent spaces open for the beta.</p>
        </div>
      </section>
    </ProfileSurface>
  );
}
