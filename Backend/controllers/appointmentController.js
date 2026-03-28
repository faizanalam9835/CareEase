const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { resend } = require('../utils/resendClient');
const appointmentEmailTemplates = require('../utils/emailTemplates');

const createAppointment = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      appointmentType,
      reason,
      symptoms
    } = req.body;

    // ✅ AUTO GENERATE ID (yahi use hoga)
    const appointmentId = "APT-" + Date.now();

    // Validation
    if (!patientId || !doctorId || !appointmentDate || !appointmentTime || !reason) {
      return res.status(400).json({
        error: 'Patient ID, doctor ID, appointment date, time and reason are required'
      });
    }

    const patient = await Patient.findOne({
      _id: patientId,
      tenantId: req.user.tenantId
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      tenantId: req.user.tenantId,
      roles: 'DOCTOR'
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // ✅ CREATE APPOINTMENT (ID ADD KAR DIYA)
    const newAppointment = new Appointment({
      appointmentId, // 🔥 FIX
      patientId,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      appointmentType: appointmentType || 'OPD',
      department: patient.department,
      reason,
      symptoms: symptoms || [],
      tenantId: req.user.tenantId,
      status: 'Scheduled'
    });

    await newAppointment.save();

    await newAppointment.populate('patientId', 'firstName lastName patientId phone email');
    await newAppointment.populate('doctorId', 'firstName lastName department email');

  try {
  await sendAppointmentEmails(
    newAppointment,
    newAppointment.patientId,
    newAppointment.doctorId
  );
} catch (emailError) {
  console.error("Email failed but appointment created:", emailError);
}

    res.status(201).json({
      message: 'Appointment booked successfully!',
      appointment: newAppointment
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// ✅ EMAIL SENDING FUNCTION
const sendAppointmentEmails = async (appointment, patient, doctor) => {
  try {
    // Send email to patient
    if (patient.email) {
      const patientEmail = appointmentEmailTemplates.patientAppointmentConfirmation(appointment, patient, doctor);
      await resend.emails.send({
        from: 'HMS Appointments <appointments@resend.dev>',
        to: patient.email,
        subject: patientEmail.subject,
        html: patientEmail.html
      });
      console.log(`✅ Appointment confirmation sent to patient: ${patient.email}`);
    }

    // Send email to doctor
    if (doctor.email) {
      const doctorEmail = appointmentEmailTemplates.doctorAppointmentNotification(appointment, patient, doctor);
      await resend.emails.send({
        from: `HMS <${process.env.EMAIL_USER}>`,
        to: doctor.email,
        subject: doctorEmail.subject,
        html: doctorEmail.html
      });
      console.log(`✅ Appointment notification sent to doctor: ${doctor.email}`);
    }

  } catch (error) {
    console.error('Error sending appointment emails:', error);
    throw error;
  }
};

// Get Appointments by Patient ID
const getAppointmentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status } = req.query;

    let filter = { 
      patientId, 
      tenantId: req.user.tenantId 
    };

    if (status) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName patientId phone')
      .populate('doctorId', 'firstName lastName department email phone')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({
      count: appointments.length,
      appointments
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Get Appointments by Doctor ID
const getAppointmentsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, date } = req.query;

    let filter = { 
      doctorId, 
      tenantId: req.user.tenantId 
    };

    if (status) {
      filter.status = status;
    }

    if (date) {
      filter.appointmentDate = new Date(date);
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName patientId phone dateOfBirth gender')
      .sort({ appointmentDate: 1, appointmentTime: 1 });

    res.json({
      count: appointments.length,
      appointments
    });

  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Update Appointment Status
const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, doctorNotes, cancellationReason } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }

    // Status update permissions
if (
  req.user.roles.includes('DOCTOR') ||
  req.user.roles.includes('RECEPTIONIST') ||
  req.user.roles.includes('HOSPITAL_ADMIN')
) {
  // All allowed roles can update status
  appointment.status = status;

  if (doctorNotes && req.user.roles.includes('DOCTOR')) {
    appointment.doctorNotes = doctorNotes;
  }

  if (cancellationReason) {
    appointment.cancellationReason = cancellationReason;
  }
} else {
  return res.status(403).json({
    error: 'You are not authorized to update appointment status'
  });
}

    await appointment.save();

    res.json({
      message: 'Appointment status updated successfully!',
      appointment: {
        id: appointment._id,
        appointmentId: appointment.appointmentId,
        status: appointment.status,
        doctorNotes: appointment.doctorNotes
      }
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      error: 'Internal server error during update'
    });
  }
};

// Get Today's Appointments
const getTodaysAppointments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let filter = {
      tenantId: req.user.tenantId,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      }
    };

    // If doctor, only show their appointments
    if (req.user.roles.includes('DOCTOR')) {
      filter.doctorId = req.user.userId;
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName patientId phone')
      .populate('doctorId', 'firstName lastName department')
      .sort({ appointmentTime: 1 });

    res.json({
      date: today.toISOString().split('T')[0],
      count: appointments.length,
      appointments
    });

  } catch (error) {
    console.error('Get today appointments error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Get All Appointments (Admin View)
const getAllAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, department, date } = req.query;
    
    let filter = { tenantId: req.user.tenantId };
    
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (date) filter.appointmentDate = new Date(date);
    
    const appointments = await Appointment.find(filter)
      .populate('patientId', 'firstName lastName patientId phone')
      .populate('doctorId', 'firstName lastName department email')
      .sort({ appointmentDate: -1, appointmentTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Appointment.countDocuments(filter);
    
    res.json({
      totalAppointments: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      appointments
    });
    
  } catch (error) {
    console.error('Get all appointments error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const {
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason,
      appointmentType,
      status,
      doctorNotes,
      cancellationReason
    } = req.body;

    // update fields
    if (patientId) appointment.patientId = patientId;
    if (doctorId) appointment.doctorId = doctorId;
    if (appointmentDate) appointment.appointmentDate = new Date(appointmentDate);
    if (appointmentTime) appointment.appointmentTime = appointmentTime;
    if (reason) appointment.reason = reason;
    if (appointmentType) appointment.appointmentType = appointmentType;

    // optional status handling
    if (status) appointment.status = status;

    if (doctorNotes) appointment.doctorNotes = doctorNotes;
    if (cancellationReason) appointment.cancellationReason = cancellationReason;

    await appointment.save();

    res.json({
      message: 'Appointment updated successfully',
      appointment
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment deleted successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
module.exports = {
  createAppointment,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  updateAppointment,
  updateAppointmentStatus,
  getTodaysAppointments,
  getAllAppointments,
  deleteAppointment
};