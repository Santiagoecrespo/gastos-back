// src/pages/JoinGroup.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getInviteInfo, joinGroup } from "../services/groups.service";

export default function JoinGroup() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inviteToken) return;

    getInviteInfo(inviteToken)
      .then(async (info) => {
        setGroupName(info.group_name);
        setGroupId(info.group_id);

        // Already authenticated → auto-join and redirect
        const token = localStorage.getItem("access_token");
        if (token) {
          await joinGroup(inviteToken);
          navigate(`/group/${info.group_id}`, { replace: true });
        }
      })
      .catch(() => setError("Este link de invitación no es válido o ya no existe."))
      .finally(() => setLoading(false));
  }, [inviteToken, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-accent-green" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4" fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">❌</div>
          <p className="text-accent-red">{error}</p>
          <Link to="/" className="btn-ghost block">Ir al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h1 className="text-xl font-bold">Te invitaron al grupo</h1>
        <p className="text-2xl font-semibold text-accent-green">{groupName}</p>
        <p className="text-gray-400 text-sm">
          Para unirte necesitás tener una cuenta.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Link
            to={`/register?redirect=/join/${inviteToken}`}
            className="btn-primary w-full text-center"
          >
            Registrarme
          </Link>
          <Link
            to={`/login?redirect=/join/${inviteToken}`}
            className="btn-ghost w-full text-center"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
