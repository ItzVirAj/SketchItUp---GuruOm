import React, { useState } from 'react';
import { TeamMember } from '../types/dashboard';
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  ShieldCheck, 
  CheckCircle, 
  X,
  MoreVertical
} from 'lucide-react';

interface TeamViewProps {
  members: TeamMember[];
  onInviteMember: (member: Omit<TeamMember, 'id' | 'lastActive'>) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ members, onInviteMember }) => {
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Senior Staff Engineer');

  const filtered = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'TM';

    onInviteMember({
      name,
      email,
      role,
      avatar,
      status: 'Active',
      projectsCount: 1
    });

    setName('');
    setEmail('');
    setShowInviteModal(false);
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> Team Roster & Permissions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage architectural staff, access levels, and active work assignments.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium hidden sm:block">
          Showing {filtered.length} active seat(s)
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Active Projects</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {m.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{m.name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{m.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{m.role}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : m.status === 'Away'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          m.status === 'Active' ? 'bg-emerald-500' : m.status === 'Away' ? 'bg-amber-500' : 'bg-slate-400'
                        }`}
                      ></span>
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">{m.projectsCount} Initiatives</td>
                  <td className="py-3 px-4 text-slate-500">{m.lastActive}</td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-base">Invite Team Member</h4>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Vance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="rachel.vance@stratum.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role Title</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="Senior Staff Engineer">Senior Staff Engineer</option>
                  <option value="Lead Architect">Lead Architect</option>
                  <option value="Product Lead">Product Lead</option>
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="DevOps & Cloud Lead">DevOps & Cloud Lead</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
