// src/pages/JoinGroup.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInvitePage, joinGroup } from "../services/groups.service";
import type { ParticipantOut } from "../types";

export default function JoinGroup() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [hostParticipantId, setHostParticipantId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [mpAlias, setMpAlias] = useState("");

  useEffect(() => {
    if (!inviteToken) return;
    getInvitePage(inviteToken)
      .then(async (info) => {
        const stored = localStorage.getItem(`group_token_${info.group_id}`);
        if (stored) {
          navigate(`/group/${info.group_id}`, { replace: true });
          return;
        }

        // Authenticated user (host) auto-joins their own profile
        const accessToken = localStorage.getItem("access_token");
        if (accessToken && info.host_participant_id) {
          const hostP = info.participants.find((p) => p.id === info.host_participant_id);
          if (hostP) {
            try {
              const result = await joinGroup(inviteToken, hostP.name, accessToken);
              localStorage.setItem(`group_token_${result.group_id}`, result.token);
              localStorage.setItem(
                `group_participant_${result.group_id}`,
                JSON.stringify({ id: result.participant_id, name: result.participant_name })
              );
              localStorage.setItem(`group_invite_token_${result.group_id}`, inviteToken!);
              navigate(`/group/${result.group_id}`, { replace: true });
              return;
            } catch {
              // fall through to show the page if auto-join fails
            }
          }
        }

        setGroupName(info.group_name);
        setGroupId(info.group_id);
        setHostParticipantId(info.host_participant_id ?? null);
        setParticipants(info.participants);
      })
      .catch(() => setError("Link inválido o expirado"))
      .finally(() => setLoading(false));
  }, [inviteToken, navigate]);

  const handleJoin = async (name: string) => {
    if (!inviteToken || joining) return;
    setJoining(true);
    setError("");
    try {
      const result = await joinGroup(inviteToken, name, undefined, mpAlias);
      localStorage.setItem(`group_token_${result.group_id}`, result.token);
      localStorage.setItem(
        `group_participant_${result.group_id}`,
        JSON.stringify({ id: result.participant_id, name: result.participant_name })
      );
      localStorage.setItem(`group_invite_token_${result.group_id}`, inviteToken!);
      navigate(`/group/${result.group_id}`);
    } catch {
      setError("No se pudo unir al grupo");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-accent-green" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error && !groupId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card text-center max-w-sm w-full">
          <div className="text-4xl mb-3">❌</div>
          <h2 className="text-lg font-bold mb-2">Link inválido</h2>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-3xl mb-2">👥</div>
          <h1 className="text-xl font-bold">{groupName}</h1>
          <p className="text-gray-400 text-sm mt-1">¿Quién sos?</p>
        </div>

        {error && (
          <p className="text-accent-red text-sm text-center">{error}</p>
        )}

        {/* Existing participants */}
        {participants.length > 0 && (
          <div className="space-y-2">
            {participants.map((p) => {
              const isHostProfile = p.id === hostParticipantId;
              return (
                <button
                  key={p.id}
                  onClick={() => !isHostProfile && handleJoin(p.name)}
                  disabled={joining || isHostProfile}
                  title={isHostProfile ? "Este perfil es del anfitrion" : undefined}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    isHostProfile
                      ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-400 cursor-not-allowed opacity-70"
                      : "btn-ghost"
                  }`}
                >
                  {p.name}
                  {isHostProfile && <span className="ml-2 text-xs">(Anfitrion - no disponible)</span>}
                </button>
              );
            })}
          </div>
        )}

        <div>
          <label htmlFor="guest-alias" className="text-xs text-gray-500 block mb-1">
            Alias para cobrar <span className="text-gray-600">(opcional)</span>
          </label>
          <input
            id="guest-alias"
            type="text"
            placeholder="ej: tu.alias"
            value={mpAlias}
            onChange={(e) => setMpAlias(e.target.value)}
            className="input text-sm"
          />
          <p className="text-xs text-gray-600 mt-1">Lo veran solo si te tienen que transferir.</p>
        </div>

        {/* New name entry */}
        <div className="border-t border-dark-300 pt-4 space-y-3">
          <p className="text-sm text-gray-500 text-center">Soy nuevo</p>
          <input
            type="text"
            placeholder="Tu nombre"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && handleJoin(newName.trim())}
            className="input"
          />
          <button
            onClick={() => newName.trim() && handleJoin(newName.trim())}
            disabled={joining || !newName.trim()}
            className="btn-primary w-full"
          >
            {joining ? "Uniendome..." : "Unirse"}
          </button>
        </div>
      </div>
    </div>
  );
}


