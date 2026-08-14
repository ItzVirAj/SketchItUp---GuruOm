import React, { useState } from 'react';
import { TeamProject } from '../types/dashboard';
import { 
  FolderKanban, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter,
  User,
  Calendar,
  X
} from 'lucide-react';

interface ProjectsViewProps {
  projects: TeamProject[];
  onUpdateProjectProgress: (id: string, progress: number) => void;
  onCreateProject: (project: Omit<TeamProject, 'id'>) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onUpdateProjectProgress,
  onCreateProject,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // New Project Form
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🚀');
  const [lead, setLead] = useState('Alex Rivera');
  const [deadline, setDeadline] = useState('Sep 30, 2026');
  const [status, setStatus] = useState<TeamProject['status']>('In Progress');

  const filteredProjects = projects.filter(p => {
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.lead.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSubmitNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateProject({
      name,
      icon,
      progress: 10,
      status,
      color: 'indigo',
      lead,
      deadline
    });

    setName('');
    setShowModal(false);
  };

  const getStatusBadge = (status: TeamProject['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Progress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Planning':
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-600" /> Active Initiatives & Roadmap
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage engineering deliverables, sprint commitments, and team allocation.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> New Initiative
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs font-semibold w-full sm:w-auto">
          {['All', 'In Progress', 'Review', 'Planning', 'Completed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterStatus === s ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects or leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
      </div>

      {/* Projects Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((proj) => (
          <div
            key={proj.id}
            className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-base border border-slate-200/60">
                    {proj.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-tight">{proj.name}</h4>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-slate-400" /> {proj.lead}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(proj.status)}`}>
                  {proj.status}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Completion</span>
                  <span className="text-indigo-600 font-bold">{proj.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={proj.progress}
                  onChange={(e) => onUpdateProjectProgress(proj.id, parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="w-3 h-3 text-slate-400" /> Due {proj.deadline}
              </span>
              <span className="font-bold text-slate-700 text-[11px]">Sprint Milestone</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-base">Create Initiative</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Vector Index Migration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Icon Emoji</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lead Architect</label>
                  <input
                    type="text"
                    value={lead}
                    onChange={(e) => setLead(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 outline-none"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Planning">Planning</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Deadline</label>
                  <input
                    type="text"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Create Initiative
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
