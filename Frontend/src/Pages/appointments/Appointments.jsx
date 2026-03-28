import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Plus,
  RefreshCw,
  User,
  Stethoscope,
  Trash,
  X,
  Pencil,
  ChevronDown
} from 'lucide-react';

const API_BASE_URL = 'https://careease-3.onrender.com/api';

/* ================= API ================= */
const apiCall = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem("authToken");

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      ...options
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Something went wrong");

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/* ================= CONFIRM MODAL ================= */
const ConfirmModal = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-lg space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-gray-600">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= MODAL ================= */
const CreateModal = ({ onClose, onSubmit, editData }) => {
  const isEdit = !!editData;

  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    appointmentType: 'OPD'
  });

  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({
        patientId: editData.patientId?._id || '',
        doctorId: editData.doctorId?._id || '',
        appointmentDate: editData.appointmentDate?.slice(0, 10) || '',
        appointmentTime: editData.appointmentTime || '',
        reason: editData.reason || '',
        appointmentType: editData.appointmentType || 'OPD'
      });
    }
  }, [editData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");

        const [docRes, patRes] = await Promise.all([
          fetch(`${API_BASE_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/patients`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const docData = await docRes.json();
        const patData = await patRes.json();

        setDoctors((docData.users || []).filter(u => u.roles?.includes('DOCTOR')));
        setPatients(patData.patients || []);
      } catch {
        toast.error("Error loading data");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!form.doctorId) return;

    const selectedDoctor = doctors.find(d => d._id === form.doctorId);
    const dept = selectedDoctor?.department?.toLowerCase() || '';

    const matched = patients.filter(
      p => p.department?.toLowerCase() === dept
    );

    setFilteredPatients(matched);
  }, [form.doctorId, doctors, patients]);

  const submit = async (e) => {
    e.preventDefault();

    if (!form.doctorId || !form.patientId) {
      toast.error("Doctor and Patient are required");
      return;
    }

    setSubmitting(true);

    const endpoint = isEdit
      ? `/appointments/${editData._id}`
      : `/appointments`;

    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiCall(endpoint, {
      method,
      body: JSON.stringify(form)
    });

    setSubmitting(false);

    if (res.success) {
      toast.success(isEdit ? "Updated" : "Created");
      onSubmit();
      onClose();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form
        onSubmit={submit}
        className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-lg"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Update Appointment" : "Create Appointment"}
          </h2>
          <X className="cursor-pointer" onClick={onClose} />
        </div>

        <select
          className="w-full h-10 px-3 rounded-lg bg-gray-50"
          value={form.doctorId}
          onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
        >
          <option value="">Select Doctor</option>
          {doctors.map(doc => (
            <option key={doc._id} value={doc._id}>
              {doc.firstName} ({doc.department})
            </option>
          ))}
        </select>

        <select
          className="w-full h-10 px-3 rounded-lg bg-gray-50"
          value={form.patientId}
          onChange={(e) => setForm({ ...form, patientId: e.target.value })}
        >
          <option value="">Select Patient</option>
          {filteredPatients.map(p => (
            <option key={p._id} value={p._id}>
              {p.firstName}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="w-full h-10 px-3 rounded-lg bg-gray-50"
          value={form.appointmentDate}
          onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
        />

        <input
          type="time"
          className="w-full h-10 px-3 rounded-lg bg-gray-50"
          value={form.appointmentTime}
          onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
        />

        <input
          placeholder="Reason"
          className="w-full h-10 px-3 rounded-lg bg-gray-50"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-cyan-600 text-white py-2 rounded-lg hover:bg-cyan-700 disabled:opacity-50"
        >
          {submitting ? "Processing..." : isEdit ? "Update" : "Create"}
        </button>
      </form>
    </div>
  );
};

/* ================= MAIN ================= */
const Appointments = () => {
  const { hasRole } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [editData, setEditData] = useState(null);

  /* delete modal state */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);

    const res = await apiCall('/appointments');

    if (res.success) {
      setAppointments(res.data.appointments || []);
    } else {
      toast.error(res.error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

const updateStatus = async (id, status) => {
  console.log("Updating:", id, status);

  const res = await apiCall(`/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });

  console.log("API Response:", res);

  if (res.success) {
    toast.success("Updated");

    setAppointments(prev =>
      prev.map(a =>
        a._id === id ? { ...a, status } : a
      )
    );
  } else {
    toast.error(res.error);
  }
};

  /* open confirm modal */
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  /* actual delete */
  const deleteAppointment = async () => {
    const res = await apiCall(`/appointments/${deleteId}`, {
      method: 'DELETE'
    });

    if (res.success) {
      toast.success("Deleted");
      fetchAppointments();
    } else {
      toast.error(res.error);
    }

    setConfirmOpen(false);
    setDeleteId(null);
  };

  const filtered = useMemo(() => {
    return appointments.filter(a => {
      const patientName = a.patientId?.firstName?.toLowerCase() || '';
      const doctorName = a.doctorId?.firstName?.toLowerCase() || '';

      return (
        (patientName.includes(searchTerm.toLowerCase()) ||
          doctorName.includes(searchTerm.toLowerCase())) &&
        (statusFilter === 'ALL' || a.status === statusFilter)
      );
    });
  }, [appointments, searchTerm, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Scheduled': return 'bg-yellow-100 text-yellow-700';
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin h-10 w-10 border-b-2 border-cyan-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Appointments</h1>

        <div className="flex gap-2">
          <button onClick={fetchAppointments} className="p-2 bg-white rounded-lg shadow-sm">
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={() => {
              setEditData(null);
              setShowCreate(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-3">
        <input
          placeholder="Search..."
          className="flex-1 h-10 px-3 rounded-lg bg-gray-50"
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="h-10 px-3 rounded-lg bg-gray-50"
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All</option>
          <option>Scheduled</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left">Patient</th>
              <th className="p-4 text-left">Doctor</th>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Time</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(a => (
              <tr key={a._id} className="hover:bg-gray-50">

                <td className="p-4">
                  <User className="inline h-4 w-4 mr-1 text-cyan-600" />
                  {a.patientId?.firstName}
                </td>

                <td className="p-4">
                  <Stethoscope className="inline h-4 w-4 mr-1 text-blue-600" />
                  {a.doctorId?.firstName}
                </td>

                <td className="p-4">
                  {a.appointmentDate
                    ? new Date(a.appointmentDate).toDateString()
                    : '-'}
                </td>

                <td className="p-4">{a.appointmentTime}</td>

                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(a.status)}`}>
                    {a.status}
                  </span>
                </td>

                <td className="p-4 flex items-center gap-2">

                  <button onClick={() => {
                    setEditData(a);
                    setShowCreate(true);
                  }}>
                    <Pencil className="h-4 w-4 text-blue-600" />
                  </button>

                  <div className="relative">
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a._id, e.target.value)}
                      className="appearance-none h-8 px-3 pr-8 rounded-lg bg-gray-100 text-xs"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <ChevronDown className="h-4 w-4 absolute right-2 top-2 pointer-events-none text-gray-500" />
                  </div>

                  {hasRole('HOSPITAL_ADMIN') && (
                    <Trash
                      onClick={() => handleDeleteClick(a._id)}
                      className="text-gray-600 cursor-pointer"
                    />
                  )}

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE/EDIT MODAL */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSubmit={fetchAppointments}
          editData={editData}
        />
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        open={confirmOpen}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={deleteAppointment}
      />

    </div>
  );
};

export default Appointments;